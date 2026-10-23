const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Partnership = require("../models/partnershipModel");
const DynamicReport = require("../modules/dynamicReports/dynamicReportModel");
const AuditReport = require("../modules/auditReports/auditReportModel");
const {
  verifyRazorpaySignature,
  matchesAuditReportPayment,
  isEligibleFreeAuditReport,
} = require("../utils/paymentSecurity");
const { getPagePaymentPrice, matchesPagePayment } = require("../utils/pagePaymentSecurity");
const { getPageContentForAccess } = require("../utils/protectedPageContent");

/**
 * Initialize Razorpay Instance
 */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Debug: Check if keys are loaded
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ CRITICAL: Razorpay Keys are missing from .env!");
} 

/**
 * @desc    Create a new Razorpay Order
 * @route   POST /api/payments/create-order
 * @access  Private
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", reportId, pageSlug } = req.body || {};

    let options;
    if (reportId) {
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return res.status(400).json({ success: false, message: "Invalid report ID" });
      }
      const report = await AuditReport.findById(reportId);
      if (!report || report.status !== "published") {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      const reportAmount = Number(report.amt);
      if (!Number.isFinite(reportAmount) || reportAmount <= 0) {
        return res.status(400).json({ success: false, message: "This report does not require payment" });
      }

      options = {
        amount: Math.round(reportAmount * 100),
        currency: "INR",
        receipt: `audit_${report._id}_${Date.now()}`,
        notes: { purpose: "audit-report", reportId: String(report._id) },
      };
    } else if (pageSlug) {
      const pagePrice = getPagePaymentPrice(pageSlug);
      if (!Number.isFinite(pagePrice)) {
        return res.status(404).json({ success: false, message: "Page payment is not configured" });
      }
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Authentication is required for this purchase" });
      }
      options = {
        amount: Math.round(pagePrice * 100),
        currency: "INR",
        receipt: `page_${Date.now()}`,
        notes: { purpose: "gated-page", pageSlug, userId: String(req.user.id) },
      };
    } else {
      const amountNum = Number(amount);
      if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ success: false, message: "Valid amount is required" });
      }
      options = {
        amount: Math.round(amountNum * 100),
        currency,
        receipt: `receipt_${Date.now()}`,
      };
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Create Order failed: Razorpay keys missing");
      return res.status(500).json({ success: false, message: "Payment gateway not configured" });
    }

    console.log("Attempting to create Razorpay order with options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created successfully:", order && order.id);

    if (!order) {
      return res.status(500).json({ success: false, message: "Error creating order" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Error:", error && (error.stack || error));
    const msg = (error && (error.message || error.error || error.description)) || "Razorpay API error";
    const payload = { success: false, message: msg };
    if (process.env.NODE_ENV !== "production") {
      payload.error = error && (error.stack || error);
    }
    res.status(500).json(payload);
  }
};

/**
 * @desc    Verify Razorpay Payment Signature
 * @route   POST /api/payments/verify
 * @access  Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, reportId, free } = req.body || {};

    if (free === true) {
      if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
        return res.status(400).json({ success: false, message: "A valid report ID is required" });
      }
      const report = await AuditReport.findById(reportId);
      if (!report || report.status !== "published") {
        return res.status(404).json({ success: false, message: "Report not found" });
      }
      if (!isEligibleFreeAuditReport(report)) {
        return res.status(400).json({ success: false, message: "This report requires payment" });
      }
      await AuditReport.findByIdAndUpdate(reportId, { isPaid: true });
      return res.status(200).json({ success: true, message: "Free report unlocked" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment details are required" });
    }

    if (reportId) {
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return res.status(400).json({ success: false, message: "Invalid report ID" });
      }
      const report = await AuditReport.findById(reportId);
      if (!report || report.status !== "published") {
        return res.status(404).json({ success: false, message: "Report not found" });
      }
      if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }

      const [order, payment] = await Promise.all([
        razorpay.orders.fetch(razorpay_order_id),
        razorpay.payments.fetch(razorpay_payment_id),
      ]);
      if (!matchesAuditReportPayment(report, order, payment)) {
        return res.status(400).json({ success: false, message: "Payment order does not match this report" });
      }

      await AuditReport.findByIdAndUpdate(reportId, { isPaid: true });
      return res.status(200).json({ success: true, message: "Payment verified successfully" });
    }

    if (verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
      console.log("✅ Payment verification successful for order:", razorpay_order_id);
      if (req.user && req.user.id) {
        // Otherwise, standard user/influencer workflow updates
        console.log("🔍 Attempting to update User ID:", req.user.id);
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id, 
          { hasPaidInfluencer: true },
          { new: true }
        );
        console.log("👤 User Update Result:", updatedUser ? "SUCCESS" : "USER NOT FOUND");
        
        const updatedPartner = await Partnership.findOneAndUpdate(
          { user: req.user.id },
          { 
            hasPaid: true,
            user: req.user.id
          },
          { upsert: true, new: true }
        );
        console.log("🤝 Partnership Payment Status Updated:", updatedPartner ? "SUCCESS" : "FAILED");
      }

      console.log("✅ Database sync complete for order:", razorpay_order_id);

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid signature, payment verification failed",
      });
    }
  } catch (error) {
    console.error("Verification Error:", error && error.message);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

/**
 * @desc    Check if the logged-in user has already paid to unlock a gated page
 * @route   GET /api/payment/page-access/:pageSlug
 * @access  Private
 */
exports.checkPageAccess = async (req, res) => {
  try {
    const { pageSlug } = req.params;
    if (!pageSlug) {
      return res.status(400).json({ success: false, message: "pageSlug is required" });
    }

    const user = await User.findById(req.user.id).select("paidPages");
    const hasAccess = !!user && Array.isArray(user.paidPages) && user.paidPages.includes(pageSlug);

    return res.status(200).json({ success: true, hasAccess });
  } catch (error) {
    console.error("Page Access Check Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPageContent = async (req, res) => {
  try {
    res.set("Cache-Control", "private, no-store");
    const { pageSlug } = req.params;
    const user = await User.findById(req.user.id).select("paidPages").lean();
    const content = getPageContentForAccess(pageSlug, user?.paidPages);
    if (content === undefined) {
      return res.status(404).json({ success: false, message: "Page content not found" });
    }
    if (content === null) {
      return res.status(403).json({ success: false, message: "Page access is required" });
    }
    return res.status(200).json({ success: true, content });
  } catch (error) {
    console.error("Protected page content request failed", { code: error.code, name: error.name });
    return res.status(500).json({ success: false, message: "Could not load page content" });
  }
};

/**
 * @desc    Verify Razorpay payment for a gated page and persist access for the logged-in user
 * @route   POST /api/payment/verify-page
 * @access  Private
 */
exports.verifyPagePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pageSlug } = req.body;

    if (!pageSlug) {
      return res.status(400).json({ success: false, message: "pageSlug is required" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment details are required" });
    }
    if (!Number.isFinite(getPagePaymentPrice(pageSlug))) {
      return res.status(400).json({ success: false, message: "Page payment is not configured" });
    }
    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature, payment verification failed",
      });
    }

    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);
    if (!matchesPagePayment(pageSlug, req.user.id, order, payment)) {
      return res.status(400).json({ success: false, message: "Payment order does not match this page" });
    }

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { paidPages: pageSlug } });

    return res.status(200).json({ success: true, message: "Payment verified, page unlocked" });
  } catch (error) {
    console.error("Page payment verification failed", { code: error.code, name: error.name });
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

exports.createDynamicReportOrder = async (req, res) => {
  try {
    const report = await DynamicReport.findOne({ slug: req.params.slug, status: "published" }).lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    const amount = Number.isFinite(report.viewingPrice) ? report.viewingPrice : 2;
    if (amount <= 0) return res.status(400).json({ success: false, message: "This report does not require payment" });

    const accessKey = `dynamic-report-${report.slug}`;
    const user = await User.findById(req.user.id).select("paidPages").lean();
    if (user?.paidPages?.includes(accessKey)) {
      return res.status(409).json({ success: false, message: "This report is already unlocked" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `report_${Date.now()}`,
      notes: { purpose: "dynamic-report", reportSlug: report.slug, userId: String(req.user.id) },
    });
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Dynamic Report Order Error:", error);
    return res.status(500).json({ success: false, message: "Could not create report payment order" });
  }
};

exports.verifyDynamicReportPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment details are required" });
    }

    const report = await DynamicReport.findOne({ slug: req.params.slug, status: "published" }).lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    const amount = Number.isFinite(report.viewingPrice) ? report.viewingPrice : 2;
    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (
      order.amount !== Math.round(amount * 100)
      || order.currency !== "INR"
      || order.notes?.purpose !== "dynamic-report"
      || order.notes?.reportSlug !== report.slug
      || order.notes?.userId !== String(req.user.id)
      || order.status !== "paid"
    ) {
      return res.status(400).json({ success: false, message: "Payment order does not match this report" });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== order.id || payment.amount !== order.amount || payment.status !== "captured") {
      return res.status(400).json({ success: false, message: "Payment is not captured for this report" });
    }

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { paidPages: `dynamic-report-${report.slug}` } });
    return res.status(200).json({ success: true, message: "Report unlocked" });
  } catch (error) {
    console.error("Dynamic Report Payment Verification Error:", error);
    return res.status(500).json({ success: false, message: "Could not verify report payment" });
  }
};
