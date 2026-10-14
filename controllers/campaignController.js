const crypto = require("crypto");
const Campaign = require("../models/Campaign");
const { calculateCampaignPrice, getCampaignPricingConfig, validateCampaignBooking } = require("../services/campaignService");
const { verifyPaymentSignature, verifyWebhookSignature, hashAccessToken, makeRazorpay } = require("../utils/campaignPayment");

const bookingFields = ["channelName", "channelId", "channelUrl", "campaignStartAt", "durationMinutes", "requestedViews", "campaignType", "videoTitle", "seoKeywords", "videoTags", "videoDescription", "t1", "t2", "t3", "clientNotes"];
const campaignStatuses = ["Pending Payment", "Paid", "Scheduled", "In Progress", "Completed", "Cancelled"];
const safeCampaign = (campaign) => {
  const result = campaign.toObject ? campaign.toObject() : campaign;
  delete result.accessTokenHash;
  delete result.processedWebhookEventIds;
  delete result.idempotencyKey;
  return result;
};
const clientCampaign = (campaign) => {
  const result = safeCampaign(campaign);
  delete result.internalAdminNotes;
  result.statusHistory = (result.statusHistory || []).map(({ status, changedAt }) => ({ status, changedAt }));
  return result;
};

function hasBookingAccess(campaign, token) {
  return Boolean(token && campaign.accessTokenHash && crypto.timingSafeEqual(
    Buffer.from(hashAccessToken(token)), Buffer.from(campaign.accessTokenHash),
  ));
}

exports.createCampaign = async (req, res) => {
  try {
    const input = req.body || {};
    for (const field of bookingFields) {
      if (input[field] !== undefined && typeof input[field] !== "string" && !["durationMinutes", "requestedViews"].includes(field)) {
        return res.status(400).json({ message: `${field} must be text` });
      }
      if (typeof input[field] === "string" && input[field].length > 10000) {
        return res.status(400).json({ message: `${field} is too long` });
      }
    }
    const validated = validateCampaignBooking(input);
    const suppliedKey = req.get("Idempotency-Key");
    const accessToken = suppliedKey && /^[A-Za-z0-9_-]{32,128}$/.test(suppliedKey) ? suppliedKey : crypto.randomBytes(32).toString("hex");
    const bookingId = `SBYT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const campaign = await Campaign.create({
      ...Object.fromEntries(bookingFields.map((field) => [field, input[field] === undefined ? "" : input[field]])),
      channelName: input.channelName.trim(),
      channelId: input.channelId.trim(),
      channelUrl: input.channelUrl.trim(),
      campaignStartAt: validated.startAt,
      durationMinutes: validated.durationMinutes,
      requestedViews: validated.requestedViews,
      pricingBreakdown: validated.pricingBreakdown,
      bookingId,
      accessTokenHash: hashAccessToken(accessToken),
      idempotencyKey: accessToken,
      clientId: req.user && req.user.id || null,
    });
    return res.status(201).json({ campaign: safeCampaign(campaign), accessToken });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Campaign.findOne({ idempotencyKey: req.get("Idempotency-Key") }).select("+accessTokenHash");
      if (existing && hasBookingAccess(existing, req.get("Idempotency-Key"))) {
        return res.status(200).json({ campaign: safeCampaign(existing), accessToken: req.get("Idempotency-Key") });
      }
      return res.status(409).json({ message: "This booking request was already submitted." });
    }
    return res.status(400).json({ message: error.message || "Unable to create campaign" });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ bookingId: req.body.bookingId }).select("+accessTokenHash");
    if (!campaign || !hasBookingAccess(campaign, req.body.accessToken)) {
      return res.status(404).json({ message: "Campaign booking not found" });
    }
    if (campaign.paymentStatus === "paid") return res.status(409).json({ message: "This campaign is already paid." });
    if (campaign.razorpayOrderId && campaign.paymentStatus === "pending") {
      return res.json({ orderId: campaign.razorpayOrderId, amount: campaign.pricingBreakdown.totalPaise, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID });
    }

    const amount = calculateCampaignPrice(campaign.requestedViews, campaign.campaignType).totalPaise;
    const order = await makeRazorpay().orders.create({ amount, currency: "INR", receipt: campaign.bookingId });
    campaign.razorpayOrderId = order.id;
    campaign.paymentStatus = "pending";
    await campaign.save();
    return res.status(201).json({ orderId: order.id, amount, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    return res.status(502).json({ message: error.message || "Unable to create payment order" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { bookingId, accessToken, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    const campaign = await Campaign.findOne({ bookingId }).select("+accessTokenHash");
    if (!campaign || !hasBookingAccess(campaign, accessToken) || campaign.razorpayOrderId !== orderId) {
      return res.status(404).json({ message: "Campaign payment not found" });
    }
    if (!verifyPaymentSignature(orderId, paymentId, signature)) return res.status(400).json({ message: "Invalid payment signature" });
    const payment = await makeRazorpay().payments.fetch(paymentId);
    if (payment.order_id !== orderId || payment.status !== "captured" || payment.amount !== campaign.pricingBreakdown.totalPaise || payment.currency !== "INR") {
      return res.status(409).json({ message: "Payment is not captured for the expected amount yet." });
    }
    await markPaid(campaign, paymentId);
    return res.json({ success: true, campaign: clientCampaign(campaign) });
  } catch (error) {
    return res.status(502).json({ message: error.message || "Unable to verify payment" });
  }
};

async function markPaid(campaign, paymentId) {
  if (campaign.paymentStatus === "paid") return;
  campaign.paymentStatus = "paid";
  campaign.razorpayPaymentId = paymentId;
  campaign.paidAt = new Date();
  if (campaign.campaignStatus === "Pending Payment") campaign.campaignStatus = "Paid";
  await campaign.save();
}

exports.webhook = async (req, res) => {
  const signature = req.get("X-Razorpay-Signature");
  if (!verifyWebhookSignature(req.rawBody, signature)) return res.status(400).json({ message: "Invalid webhook signature" });
  const eventId = req.get("X-Razorpay-Event-Id");
  if (!eventId) return res.status(400).json({ message: "Missing webhook event ID" });
  try {
    const event = req.body || {};
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (!payment || !["payment.captured", "order.paid", "payment.failed"].includes(event.event)) return res.json({ received: true });
    const campaign = await Campaign.findOne({ razorpayOrderId: payment.order_id }).select("+accessTokenHash");
    if (!campaign) return res.json({ received: true });
    const claimedCampaign = await Campaign.findOneAndUpdate(
      { _id: campaign._id, processedWebhookEventIds: { $ne: eventId } },
      { $addToSet: { processedWebhookEventIds: eventId } },
      { new: true },
    ).select("+accessTokenHash");
    if (!claimedCampaign) return res.json({ received: true, duplicate: true });
    if (event.event === "payment.failed") {
      await Campaign.updateOne({ _id: claimedCampaign._id, paymentStatus: { $ne: "paid" } }, { $set: { paymentStatus: "failed" } });
    } else if (payment.status === "captured" && payment.amount === claimedCampaign.pricingBreakdown.totalPaise && payment.currency === "INR") {
      await markPaid(claimedCampaign, payment.id);
    }
    return res.json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};

exports.getCampaign = async (req, res) => {
  const campaign = await Campaign.findOne({ bookingId: req.params.bookingId }).select("+accessTokenHash");
  if (!campaign) return res.status(404).json({ message: "Campaign booking not found" });
  const isOwner = req.user && campaign.clientId && String(campaign.clientId) === String(req.user.id);
  const isAdmin = req.user && ["admin", "partner", "partnership"].includes(String(req.user.role || "").toLowerCase());
  if (!isOwner && !isAdmin && !hasBookingAccess(campaign, req.get("X-Campaign-Access-Token"))) return res.status(403).json({ message: "Access denied" });
  return res.json({ campaign: isAdmin ? safeCampaign(campaign) : clientCampaign(campaign) });
};

exports.getOwnCampaigns = async (req, res) => {
  const isAdmin = ["admin", "partner", "partnership"].includes(String(req.user.role || "").toLowerCase());
  if (isAdmin) return exports.adminList(req, res);
  const campaigns = await Campaign.find({ clientId: req.user.id }).sort({ createdAt: -1 });
  return res.json({ campaigns: campaigns.map(clientCampaign) });
};

exports.adminList = async (req, res) => {
  const { page = 1, limit = 25, search, paymentStatus, campaignStatus, campaignType, from, to } = req.query;
  const query = {};
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (campaignStatus) query.campaignStatus = campaignStatus;
  if (campaignType) query.campaignType = campaignType;
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if ((fromDate && !Number.isFinite(fromDate.getTime())) || (toDate && !Number.isFinite(toDate.getTime()))) return res.status(400).json({ message: "Invalid date filter" });
    query.campaignStartAt = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    const escapedSearch = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = ["bookingId", "channelName", "channelId", "channelUrl"].map((field) => ({ [field]: { $regex: escapedSearch, $options: "i" } }));
  }
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
  const [campaigns, total, summaryRows] = await Promise.all([
    Campaign.find(query).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
    Campaign.countDocuments(query),
    Campaign.aggregate([{ $group: { _id: null,
      totalCampaigns: { $sum: 1 },
      pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } },
      paidCampaigns: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
      scheduledCampaigns: { $sum: { $cond: [{ $eq: ["$campaignStatus", "Scheduled"] }, 1, 0] } },
      inProgressCampaigns: { $sum: { $cond: [{ $eq: ["$campaignStatus", "In Progress"] }, 1, 0] } },
      completedCampaigns: { $sum: { $cond: [{ $eq: ["$campaignStatus", "Completed"] }, 1, 0] } },
      cancelledCampaigns: { $sum: { $cond: [{ $eq: ["$campaignStatus", "Cancelled"] }, 1, 0] } },
      totalRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$pricingBreakdown.total", 0] } },
      basicCampaigns: { $sum: { $cond: [{ $eq: ["$campaignType", "Basic"] }, 1, 0] } },
      ageRestrictedCampaigns: { $sum: { $cond: [{ $eq: ["$campaignType", "Age-Restricted"] }, 1, 0] } },
    } }]),
  ]);
  const summary = summaryRows[0] || { totalCampaigns: 0, pendingPayments: 0, paidCampaigns: 0, scheduledCampaigns: 0, inProgressCampaigns: 0, completedCampaigns: 0, cancelledCampaigns: 0, totalRevenue: 0, basicCampaigns: 0, ageRestrictedCampaigns: 0 };
  return res.json({ campaigns: campaigns.map(safeCampaign), summary, page: pageNumber, pages: Math.ceil(total / pageSize), total });
};

exports.adminUpdate = async (req, res) => {
  const campaign = await Campaign.findOne({ bookingId: req.params.bookingId });
  if (!campaign) return res.status(404).json({ message: "Campaign booking not found" });
  const { campaignStatus, internalAdminNotes } = req.body || {};
  if (campaignStatus !== undefined) {
    if (!campaignStatuses.includes(campaignStatus)) return res.status(400).json({ message: "Invalid campaign status" });
    if (campaignStatus === "Paid" && campaign.paymentStatus !== "paid") return res.status(409).json({ message: "Only verified payments can be marked Paid." });
    if (campaignStatus === "Scheduled" && campaign.paymentStatus !== "paid") return res.status(409).json({ message: "Only verified paid campaigns can be scheduled." });
    campaign.campaignStatus = campaignStatus;
    campaign.statusHistory.push({ status: campaignStatus, adminId: req.user.id, adminName: req.user.name, changedAt: new Date() });
  }
  if (internalAdminNotes !== undefined) {
    if (typeof internalAdminNotes !== "string" || internalAdminNotes.length > 10000) return res.status(400).json({ message: "Invalid admin notes" });
    campaign.internalAdminNotes = internalAdminNotes;
  }
  await campaign.save();
  return res.json({ campaign: safeCampaign(campaign) });
};

exports.exportCsv = async (req, res) => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 });
  const columns = ["bookingId", "channelName", "channelId", "channelUrl", "requestedViews", "campaignType", "campaignStartAt", "durationMinutes", "paymentStatus", "campaignStatus", "baseAmount", "campaignGst", "estimatedRazorpayFee", "estimatedRazorpayFeeGst", "total", "createdAt"];
  const quote = (value) => {
    const cell = String(value ?? "");
    const safeCell = /^[=+@\-]/.test(cell) ? `'${cell}` : cell;
    return `"${safeCell.replace(/"/g, '""')}"`;
  };
  const lines = [columns.join(","), ...campaigns.map((campaign) => columns.map((column) => quote(campaign.pricingBreakdown[column] ?? campaign[column])).join(","))];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=campaigns.csv");
  return res.send(lines.join("\r\n"));
};

exports.getPricing = (req, res) => res.json(getCampaignPricingConfig());