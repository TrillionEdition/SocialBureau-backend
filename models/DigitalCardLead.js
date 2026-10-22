const mongoose = require("mongoose");
const configuredRetentionDays = Number.parseInt(process.env.DIGITAL_CARD_RETENTION_DAYS || "730", 10);
const retentionDays = Number.isFinite(configuredRetentionDays) && configuredRetentionDays >= 30
  ? configuredRetentionDays
  : 730;

const noteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const digitalCardLeadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    company: { type: String, trim: true, maxlength: 160, default: "" },
    designation: { type: String, trim: true, maxlength: 120, default: "" },
    interest: { type: String, trim: true, maxlength: 80, default: "" },
    message: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["new", "contacted", "follow_up", "converted", "closed"],
      default: "new",
      index: true,
    },
    consent: {
      given: { type: Boolean, required: true, enum: [true] },
      policyVersion: { type: String, required: true },
      consentedAt: { type: Date, required: true },
      ipHash: { type: String, required: true },
      userAgent: { type: String, maxlength: 500, default: "" },
    },
    idempotencyKey: { type: String, required: true, unique: true },
    notes: { type: [noteSchema], default: [] },
  },
  { timestamps: true }
);

digitalCardLeadSchema.index({ createdAt: -1 });
digitalCardLeadSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 });
digitalCardLeadSchema.index({ fullName: "text", phone: "text", email: "text", company: "text" });

module.exports =
  mongoose.models.DigitalCardLead ||
  mongoose.model("DigitalCardLead", digitalCardLeadSchema);
