const crypto = require("crypto");
const mongoose = require("mongoose");
const DigitalCardLead = require("../models/DigitalCardLead");
const { STATUSES, validateLeadInput, csvCell } = require("../utils/digitalCardLeadUtils");

const POLICY_VERSION = process.env.DIGITAL_CARD_PRIVACY_VERSION || "2026-10";

function hashIp(ip) {
  return crypto
    .createHash("sha256")
    .update(`${process.env.CONSENT_HASH_SECRET || process.env.JWT_SECRET_KEY}:${ip || "unknown"}`)
    .digest("hex");
}

exports.createLead = async (req, res) => {
  if (typeof req.body.website === "string" && req.body.website.trim()) {
    return res.status(400).json({ message: "Unable to submit this request." });
  }

  const key = req.get("Idempotency-Key");
  if (!key || !/^[\w-]{16,100}$/.test(key)) {
    return res.status(400).json({ message: "Please retry your submission." });
  }

  const { errors, lead } = validateLeadInput(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Please correct the highlighted fields.", errors });
  }

  const existingLead = await DigitalCardLead.findOne({ idempotencyKey: key }).select("_id");
  if (existingLead) return res.status(200).json({ success: true, message: "Your details have been saved." });

  try {
    await DigitalCardLead.create({
      ...lead,
      idempotencyKey: key,
      consent: {
        given: true,
        policyVersion: POLICY_VERSION,
        consentedAt: new Date(),
        ipHash: hashIp(req.ip),
        userAgent: String(req.get("user-agent") || "").slice(0, 500),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true, message: "Your details have been saved." });
    }
    throw error;
  }
  return res.status(201).json({ success: true, message: "Your details have been saved." });
};

exports.listLeads = async (req, res) => {
  const { q = "", status = "", interest = "", from = "", to = "" } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const query = {};

  if (status) {
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid lead status." });
    query.status = status;
  }
  if (interest) query.interest = interest;
  if (from || to) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) {
      return res.status(400).json({ message: "Invalid date filter." });
    }
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lt = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000);
  }
  const search = String(q).trim().slice(0, 120);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = ["fullName", "phone", "email", "company"].map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    }));
  }

  const [leads, total, totalLeads, statusCounts] = await Promise.all([
    DigitalCardLead.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    DigitalCardLead.countDocuments(query),
    DigitalCardLead.countDocuments(),
    Promise.all(STATUSES.map((value) => DigitalCardLead.countDocuments({ status: value }))),
  ]);

  return res.json({
    leads,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    overview: {
      total: totalLeads,
      new: statusCounts[0],
      contacted: statusCounts[1],
      followUp: statusCounts[2],
    },
  });
};

exports.updateLead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Lead not found." });
  const { status } = req.body;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid lead status." });
  }
  const lead = await DigitalCardLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found." });
  if (status !== undefined) lead.status = status;
  await lead.save();
  return res.json({ lead });
};

exports.addNote = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Lead not found." });
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 2000) {
    return res.status(400).json({ message: "Notes must be between 1 and 2000 characters." });
  }
  const lead = await DigitalCardLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found." });
  lead.notes.push({
    body,
    authorId: String(req.user.id),
    authorName: String(req.user.name || req.user.email),
  });
  await lead.save();
  return res.status(201).json({ lead });
};

exports.deleteLead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Lead not found." });
  const deleted = await DigitalCardLead.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Lead not found." });
  return res.json({ success: true });
};

exports.exportLeads = async (req, res) => {
  const leads = await DigitalCardLead.find().sort({ createdAt: -1 }).lean();
  const columns = [
    ["Received (UTC)", (lead) => lead.createdAt.toISOString()],
    ["Full Name", (lead) => lead.fullName],
    ["Mobile", (lead) => lead.phone],
    ["Email", (lead) => lead.email],
    ["Company", (lead) => lead.company],
    ["Designation", (lead) => lead.designation],
    ["Business Interest", (lead) => lead.interest],
    ["Consent", (lead) => (lead.consent.given ? "Given" : "Not given")],
    ["Status", (lead) => lead.status],
    ["Message", (lead) => lead.message],
  ];
  const csv = [
    columns.map(([label]) => csvCell(label)).join(","),
    ...leads.map((lead) => columns.map(([, value]) => csvCell(value(lead))).join(",")),
  ].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="socialbureau-leads.csv"');
  return res.send(`\uFEFF${csv}`);
};
