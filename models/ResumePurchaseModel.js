const mongoose = require('mongoose');

// One purchase = 10 resume downloads for a company. No credit/wallet system —
// each purchase independently tracks its own downloadsPurchased/downloadsUsed.
const resumePurchaseSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    razorpaySignature: { type: String },

    amount: { type: Number, required: true, default: 199 },
    // amount: { type: Number, required: true, default: 2 },
    downloadsPurchased: { type: Number, required: true, default: 10 },
    downloadsUsed: { type: Number, required: true, default: 0 },

    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResumePurchase', resumePurchaseSchema);
