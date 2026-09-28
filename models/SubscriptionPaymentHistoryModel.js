const mongoose = require("mongoose");

// A single billing-cycle payment event (success or failure) for a
// ClientSubscription, recorded from Razorpay webhooks.
const SubscriptionPaymentHistorySchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientSubscription",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
    },
    razorpayInvoiceId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["captured", "failed", "refunded"],
      required: true,
      index: true,
    },
    method: {
      type: String,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      trim: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

SubscriptionPaymentHistorySchema.index({ subscriptionId: 1, createdAt: -1 });
SubscriptionPaymentHistorySchema.index({ clientId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "SubscriptionPaymentHistory",
  SubscriptionPaymentHistorySchema
);
