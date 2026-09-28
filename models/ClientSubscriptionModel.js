const mongoose = require("mongoose");

// Tracks a Razorpay recurring subscription assigned to a client (User with
// role "client") by an admin. One Razorpay Plan + Subscription is created
// per client and this record mirrors its lifecycle via webhooks.
const ClientSubscriptionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    razorpayPlanId: {
      type: String,
      required: true,
    },
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayCustomerId: {
      type: String,
      sparse: true,
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
    billingInterval: {
      type: String,
      enum: ["monthly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "paused",
        "cancelled",
        "completed",
        "expired",
      ],
      default: "created",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    nextBillingDate: {
      type: Date,
    },
    lastPaymentId: {
      type: String,
    },
    lastPaymentStatus: {
      type: String,
      enum: ["captured", "failed", "refunded", null],
      default: null,
    },
    lastPaymentAt: {
      type: Date,
    },
    totalCount: {
      type: Number,
      default: 120, // effectively "until cancelled" (10 years of monthly cycles)
    },
    notes: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Recently processed Razorpay webhook event IDs, used to make webhook
    // handling idempotent (duplicate deliveries are ignored).
    processedEventIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

ClientSubscriptionSchema.index({ clientId: 1, isDeleted: 1 });
ClientSubscriptionSchema.index({ status: 1, isDeleted: 1 });
ClientSubscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ClientSubscription", ClientSubscriptionSchema);
