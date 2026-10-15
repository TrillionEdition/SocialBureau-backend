const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const InvoiceCounter = mongoose.models.InvoiceCounter || mongoose.model("InvoiceCounter", counterSchema);

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  // Unique payment/order IDs make invoice creation idempotent per Razorpay payment.
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String, required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
  bookingId: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  description: { type: String, required: true },
  baseAmount: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  processingFee: { type: Number, default: 0 },
  processingFeeGst: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  issuedAt: { type: Date, default: Date.now },
  emailSentAt: { type: Date, default: null },
}, { timestamps: true });

async function nextInvoiceNumber(date = new Date()) {
  const year = date.getUTCFullYear();
  const counter = await InvoiceCounter.findOneAndUpdate({ _id: `invoice-${year}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `SB-INV-${year}-${String(counter.seq).padStart(6, "0")}`;
}

module.exports = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
module.exports.nextInvoiceNumber = nextInvoiceNumber;
