const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["topup", "campaign_payment", "campaign_refund"], required: true },
  direction: { type: String, enum: ["credit", "debit"], required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  balanceAfterPaise: { type: Number, default: null },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending", index: true },
  // Unique per business event so a retry can never apply the same movement twice.
  reference: { type: String, required: true, unique: true },
  bookingId: { type: String, default: undefined },
  razorpayOrderId: { type: String, default: undefined, unique: true, sparse: true },
  razorpayPaymentId: { type: String, default: undefined, unique: true, sparse: true },
}, { timestamps: true });

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
