const Razorpay = require('razorpay');
const crypto = require('crypto');

const ResumeListing = require('../models/ResumeListingModel');
const ResumePurchase = require('../models/ResumePurchaseModel');
const ResumeDownload = require('../models/ResumeDownloadModel');
const upload = require('../middlewares/cloudflare');

const RESUME_PACKAGE_PRICE = 199; // INR
// const RESUME_PACKAGE_PRICE = 2;
const RESUME_PACKAGE_DOWNLOADS = 10;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const BASIC_FIELDS = ResumeListing.BASIC_FIELDS;

function buildListingFilter(query, { publishedOnly }) {
  const { search, category, location, skill, minExp, maxExp } = query;
  const filter = {};
  if (publishedOnly) filter.isPublished = true;

  if (category) filter.category = new RegExp(`^${category}$`, 'i');
  if (location) filter.location = new RegExp(location, 'i');
  if (skill) filter.skills = new RegExp(skill, 'i');

  if (minExp !== undefined && minExp !== '') {
    filter.experienceMax = { ...(filter.experienceMax || {}), $gte: Number(minExp) };
  }
  if (maxExp !== undefined && maxExp !== '') {
    filter.experienceMin = { ...(filter.experienceMin || {}), $lte: Number(maxExp) };
  }

  if (search) {
    filter.$or = [
      { jobTitle: new RegExp(search, 'i') },
      { category: new RegExp(search, 'i') },
      { skills: new RegExp(search, 'i') },
      { location: new RegExp(search, 'i') },
      { candidateName: new RegExp(search, 'i') },
    ];
  }

  return filter;
}

function paginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 12));
  return { page, limit, skip: (page - 1) * limit };
}

/* =========================================================
   COMPANY-FACING (basic info only, pre-payment)
========================================================= */

// GET /resumes — browse/search/filter/paginate, basic fields only
exports.getListings = async (req, res) => {
  try {
    const filter = buildListingFilter(req.query, { publishedOnly: true });
    const { page, limit, skip } = paginationParams(req.query);

    const [items, total] = await Promise.all([
      ResumeListing.find(filter).select(BASIC_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ResumeListing.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error('getListings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /resumes/:id — basic info only (candidate identity/contact/resume file withheld)
exports.getListingBasic = async (req, res) => {
  try {
    const listing = await ResumeListing.findOne({ _id: req.params.id, isPublished: true }).select(BASIC_FIELDS);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Resume listing not found' });
    }
    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    console.error('getListingBasic error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /resumes/:id/full — payment-gated: consumes 1 download credit (unless already unlocked)
exports.unlockResume = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;

    const listing = await ResumeListing.findOne({ _id: id, isPublished: true });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Resume listing not found' });
    }

    let downloadRecord = await ResumeDownload.findOne({ companyId, resumeId: id });

    if (!downloadRecord) {
      // Atomically consume 1 credit from the oldest paid purchase with remaining balance.
      const purchase = await ResumePurchase.findOneAndUpdate(
        { companyId, status: 'paid', $expr: { $lt: ['$downloadsUsed', '$downloadsPurchased'] } },
        { $inc: { downloadsUsed: 1 } },
        { new: true, sort: { createdAt: 1 } }
      );

      if (!purchase) {
        return res.status(402).json({
          success: false,
          message: 'No resume downloads remaining. Please purchase a package (10 downloads for ₹199).',
        });
      }

      try {
        downloadRecord = await ResumeDownload.create({ companyId, resumeId: id, purchaseId: purchase._id });
        await ResumeListing.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } });
      } catch (err) {
        // Concurrent duplicate unlock attempt — refund the credit we just consumed.
        if (err && err.code === 11000) {
          await ResumePurchase.findByIdAndUpdate(purchase._id, { $inc: { downloadsUsed: -1 } });
          downloadRecord = await ResumeDownload.findOne({ companyId, resumeId: id });
        } else {
          throw err;
        }
      }
    }

    res.status(200).json({ success: true, message: 'Resume unlocked', data: listing });
  } catch (error) {
    console.error('unlockResume error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================================
   COMPANY-FACING — Purchases (Razorpay, reused gateway)
========================================================= */

// POST /purchase/create-order
exports.createPurchaseOrder = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    const order = await razorpay.orders.create({
      amount: RESUME_PACKAGE_PRICE * 100,
      currency: 'INR',
      receipt: `resume_pkg_${Date.now()}`,
    });

    const purchase = await ResumePurchase.create({
      companyId: req.user.id,
      razorpayOrderId: order.id,
      amount: RESUME_PACKAGE_PRICE,
      downloadsPurchased: RESUME_PACKAGE_DOWNLOADS,
      downloadsUsed: 0,
      status: 'created',
    });

    res.status(200).json({ success: true, order, purchaseId: purchase._id });
  } catch (error) {
    console.error('createPurchaseOrder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /purchase/verify — idempotent: repeated calls for the same order never double-grant downloads
exports.verifyPurchasePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details' });
    }

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature, payment verification failed' });
    }

    const purchase = await ResumePurchase.findOne({
      razorpayOrderId: razorpay_order_id,
      companyId: req.user.id,
    });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (purchase.status === 'paid') {
      // Duplicate callback/webhook for an already-verified order — no-op.
      return res.status(200).json({ success: true, message: 'Payment already verified', data: purchase });
    }

    purchase.status = 'paid';
    purchase.razorpayPaymentId = razorpay_payment_id;
    purchase.razorpaySignature = razorpay_signature;
    purchase.paidAt = new Date();

    try {
      await purchase.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ success: false, message: 'This payment has already been processed' });
      }
      throw err;
    }

    res.status(200).json({
      success: true,
      message: `Payment verified. ${RESUME_PACKAGE_DOWNLOADS} downloads added.`,
      data: purchase,
    });
  } catch (error) {
    console.error('verifyPurchasePayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /purchases/my — purchase history + remaining downloads
exports.getMyPurchases = async (req, res) => {
  try {
    const companyId = req.user.id;
    const purchases = await ResumePurchase.find({ companyId }).sort({ createdAt: -1 });

    const remainingDownloads = purchases
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Math.max(0, p.downloadsPurchased - p.downloadsUsed), 0);

    res.status(200).json({ success: true, data: purchases, remainingDownloads });
  } catch (error) {
    console.error('getMyPurchases error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /downloads/my — download history
exports.getMyDownloads = async (req, res) => {
  try {
    const companyId = req.user.id;
    const downloads = await ResumeDownload.find({ companyId })
      .sort({ createdAt: -1 })
      .populate('resumeId', 'jobTitle category candidateName location')
      .populate('purchaseId', 'razorpayOrderId amount');

    res.status(200).json({ success: true, data: downloads });
  } catch (error) {
    console.error('getMyDownloads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================================
   ADMIN — Resume Management
========================================================= */

// GET /admin/resumes
exports.getAdminListings = async (req, res) => {
  try {
    const filter = buildListingFilter(req.query, { publishedOnly: false });
    if (req.query.status === 'published') filter.isPublished = true;
    if (req.query.status === 'unpublished') filter.isPublished = false;

    const { page, limit, skip } = paginationParams(req.query);

    const [items, total] = await Promise.all([
      ResumeListing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ResumeListing.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error('getAdminListings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /admin/resumes/:id
exports.getAdminListingById = async (req, res) => {
  try {
    const listing = await ResumeListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Resume listing not found' });
    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    console.error('getAdminListingById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /admin/resumes
exports.createListing = async (req, res) => {
  try {
    if (!req.file || !req.file.location) {
      return res.status(400).json({ success: false, message: 'Resume file (PDF/DOC/DOCX) is required' });
    }

    const body = req.body || {};
    if (!body.candidateName || !body.jobTitle || !body.category || !body.location) {
      return res.status(400).json({
        success: false,
        message: 'candidateName, jobTitle, category and location are required',
      });
    }

    const skills = Array.isArray(body.skills)
      ? body.skills
      : typeof body.skills === 'string' && body.skills.length
      ? body.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let education = [];
    if (body.education) {
      try {
        education = typeof body.education === 'string' ? JSON.parse(body.education) : body.education;
      } catch {
        education = [];
      }
    }

    const listing = await ResumeListing.create({
      candidateName: body.candidateName,
      candidateEmail: body.candidateEmail || '',
      candidatePhone: body.candidatePhone || '',
      jobTitle: body.jobTitle,
      category: body.category,
      experienceMin: Number(body.experienceMin) || 0,
      experienceMax: Number(body.experienceMax) || 0,
      location: body.location,
      skills,
      skillsSummary: body.skillsSummary || skills.slice(0, 5).join(', '),
      education,
      fullProfileSummary: body.fullProfileSummary || '',
      resumeFileUrl: req.file.location,
      resumeFileName: req.file.originalname,
      resumeFileType: req.file.mimetype,
      isPublished: body.isPublished === undefined ? true : body.isPublished === 'true' || body.isPublished === true,
      uploadedBy: req.user.id,
    });

    res.status(201).json({ success: true, message: 'Resume listing created', data: listing });
  } catch (error) {
    console.error('createListing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /admin/resumes/:id
exports.updateListing = async (req, res) => {
  try {
    const listing = await ResumeListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Resume listing not found' });

    const body = req.body || {};
    const updateData = {};

    [
      'candidateName',
      'candidateEmail',
      'candidatePhone',
      'jobTitle',
      'category',
      'location',
      'skillsSummary',
      'fullProfileSummary',
    ].forEach((field) => {
      if (body[field] !== undefined) updateData[field] = body[field];
    });

    if (body.experienceMin !== undefined) updateData.experienceMin = Number(body.experienceMin) || 0;
    if (body.experienceMax !== undefined) updateData.experienceMax = Number(body.experienceMax) || 0;

    if (body.skills !== undefined) {
      updateData.skills = Array.isArray(body.skills)
        ? body.skills
        : typeof body.skills === 'string'
        ? body.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }

    if (body.education !== undefined) {
      try {
        updateData.education = typeof body.education === 'string' ? JSON.parse(body.education) : body.education;
      } catch {
        // leave education unchanged if malformed
      }
    }

    if (body.isPublished !== undefined) {
      updateData.isPublished = body.isPublished === 'true' || body.isPublished === true;
    }

    if (req.file && req.file.location) {
      if (listing.resumeFileUrl) {
        await upload.deleteFromR2(listing.resumeFileUrl);
      }
      updateData.resumeFileUrl = req.file.location;
      updateData.resumeFileName = req.file.originalname;
      updateData.resumeFileType = req.file.mimetype;
    }

    const updated = await ResumeListing.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Resume listing updated', data: updated });
  } catch (error) {
    console.error('updateListing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /admin/resumes/:id/publish
exports.togglePublish = async (req, res) => {
  try {
    const listing = await ResumeListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Resume listing not found' });

    listing.isPublished = !listing.isPublished;
    await listing.save();

    res.status(200).json({ success: true, message: 'Publish status updated', data: listing });
  } catch (error) {
    console.error('togglePublish error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /admin/resumes/:id
exports.deleteListing = async (req, res) => {
  try {
    const listing = await ResumeListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Resume listing not found' });

    if (listing.resumeFileUrl) {
      await upload.deleteFromR2(listing.resumeFileUrl);
    }
    await ResumeListing.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Resume listing deleted' });
  } catch (error) {
    console.error('deleteListing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
