// const mongoose = require('mongoose');

// const subscriptionSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   planType: {
//     type: String,
//     enum: ['basic', 'pro', 'premium'],
//     required: true,
//   },
//   planAmount: {
//     type: Number,
//     required: true,
//   },
//   razorpaySubscriptionId: {
//     type: String,
//     unique: true,
//     sparse: true,
//   },
//   razorpayPaymentId: {
//     type: String,
//     unique: true,
//     sparse: true,
//   },
//   razorpayCustomerId: {
//     type: String,
//   },
//   status: {
//     type: String,
//     enum: ['active', 'paused', 'cancelled', 'failed', 'expired'],
//     default: 'active',
//   },
//   billingCycle: {
//     type: String,
//     enum: ['monthly', 'yearly'],
//     default: 'monthly',
//   },
//   startDate: {
//     type: Date,
//     default: Date.now,
//   },
//   nextBillingDate: {
//     type: Date,
//   },
//   endDate: {
//     type: Date,
//     default: null,
//   },
//   renewalCount: {
//     type: Number,
//     default: 0,
//   },
//   paymentHistory: [{
//     paymentId: String,
//     amount: Number,
//     date: Date,
//     status: String,
//   }],
//   notes: {
//     type: Map,
//     of: String,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// const Subscription = mongoose.model('Subscription', subscriptionSchema);