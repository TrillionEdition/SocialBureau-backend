
// const Razorpay = require('razorpay');
// const crypto = require('crypto');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // PLAN DEFINITIONS
// const PLANS = {
//   basic: { id: 'plan_00000000000001', amount: 29900, name: 'Basic' },
//   pro: { id: 'plan_00000000000002', amount: 59900, name: 'Pro' },
//   premium: { id: 'plan_00000000000003', amount: 99900, name: 'Premium' },
// };

// // Get all plans
// getPlans : (req, res) => {
//   try {
//     const plans = Object.entries(PLANS).map(([key, value]) => ({
//       type: key,
//       ...value,
//       amount: value.amount / 100,
//     }));

//     res.json({ success: true, plans });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Create subscription
// createSubscription : async (req, res) => {
//   try {
//     const { planType } = req.body;
//     const userId = req.userId;

//     if (!PLANS[planType]) {
//       return res.status(400).json({ success: false, error: 'Invalid plan type' });
//     }

//     const plan = PLANS[planType];

//     // Create subscription in Razorpay
//     const subscription = await razorpay.subscriptions.create({
//       plan_id: plan.id,
//       quantity: 1,
//       total_count: 0,
//       start_at: Math.floor(Date.now() / 1000),
//       notes: {
//         userId: userId,
//         planType: planType,
//       },
//     });

//     // Save subscription to MongoDB
//     const newSubscription = new Subscription({
//       userId,
//       planType,
//       planAmount: plan.amount,
//       razorpaySubscriptionId: subscription.id,
//       status: 'active',
//     });

//     await newSubscription.save();

//     res.json({
//       success: true,
//       subscriptionId: subscription.id,
//       keyId: process.env.RAZORPAY_KEY_ID,
//       planAmount: plan.amount / 100,
//     });
//   } catch (error) {
//     console.error('Subscription creation error:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Verify subscription payment
// verifyPayment : async (req, res) => {
//   try {
//     const {
//       razorpay_payment_id,
//       razorpay_subscription_id,
//       razorpay_signature,
//     } = req.body;
//     const userId = req.userId;

//     // Verify signature
//     const generatedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_payment_id + '|' + razorpay_subscription_id)
//       .digest('hex');

//     if (generatedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         error: 'Signature verification failed',
//       });
//     }

//     // Update subscription in database
//     const subscription = await Subscription.findOneAndUpdate(
//       { razorpaySubscriptionId: razorpay_subscription_id, userId },
//       {
//         razorpayPaymentId: razorpay_payment_id,
//         status: 'active',
//         nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//         updatedAt: new Date(),
//       },
//       { new: true }
//     );

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         error: 'Subscription not found',
//       });
//     }

//     // Update user's current subscription
//     await User.findByIdAndUpdate(userId, {
//       currentSubscription: subscription._id,
//     });

//     res.json({
//       success: true,
//       message: 'Subscription activated successfully',
//       subscription,
//     });
//   } catch (error) {
//     console.error('Verification error:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Get user's current subscription
// getUserSubscription : async (req, res) => {
//   try {
//     const userId = req.userId;

//     const subscription = await Subscription.findOne({
//       userId,
//       status: 'active',
//     }).select('planType planAmount status startDate nextBillingDate');

//     if (!subscription) {
//       return res.json({ success: true, subscription: null });
//     }

//     res.json({
//       success: true,
//       subscription: {
//         id: subscription._id,
//         planType: subscription.planType,
//         amount: subscription.planAmount / 100,
//         status: subscription.status,
//         startDate: subscription.startDate,
//         nextBillingDate: subscription.nextBillingDate,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Get subscription history
// getSubscriptionHistory : async (req, res) => {
//   try {
//     const userId = req.userId;

//     const subscriptions = await Subscription.find({ userId })
//       .sort({ createdAt: -1 })
//       .select('planType planAmount status startDate endDate createdAt');

//     res.json({ success: true, subscriptions });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Pause subscription
// pauseSubscription : async (req, res) => {
//   try {
//     const { subscriptionId } = req.body;
//     const userId = req.userId;

//     const subscription = await Subscription.findOne({
//       _id: subscriptionId,
//       userId,
//     });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         error: 'Subscription not found',
//       });
//     }

//     // Pause in Razorpay
//     await razorpay.subscriptions.pause(subscription.razorpaySubscriptionId);

//     // Update in MongoDB
//     subscription.status = 'paused';
//     subscription.updatedAt = new Date();
//     await subscription.save();

//     res.json({
//       success: true,
//       message: 'Subscription paused successfully',
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Resume subscription
// resumeSubscription : async (req, res) => {
//   try {
//     const { subscriptionId } = req.body;
//     const userId = req.userId;

//     const subscription = await Subscription.findOne({
//       _id: subscriptionId,
//       userId,
//     });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         error: 'Subscription not found',
//       });
//     }

//     // Resume in Razorpay
//     await razorpay.subscriptions.resume(subscription.razorpaySubscriptionId);

//     // Update in MongoDB
//     subscription.status = 'active';
//     subscription.updatedAt = new Date();
//     await subscription.save();

//     res.json({
//       success: true,
//       message: 'Subscription resumed successfully',
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Cancel subscription
// cancelSubscription : async (req, res) => {
//   try {
//     const { subscriptionId } = req.body;
//     const userId = req.userId;

//     const subscription = await Subscription.findOne({
//       _id: subscriptionId,
//       userId,
//     });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         error: 'Subscription not found',
//       });
//     }

//     // Cancel in Razorpay
//     await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);

//     // Update in MongoDB
//     subscription.status = 'cancelled';
//     subscription.endDate = new Date();
//     subscription.updatedAt = new Date();
//     await subscription.save();

//     res.json({
//       success: true,
//       message: 'Subscription cancelled successfully',
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Handle webhooks
// handleWebhook : async (req, res) => {
//   try {
//     const signature = req.headers['x-razorpay-signature'];
//     const generatedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
//       .update(JSON.stringify(req.body))
//       .digest('hex');

//     if (generatedSignature !== signature) {
//       return res.status(403).json({ error: 'Invalid signature' });
//     }

//     const event = req.body.event;
//     const data = req.body.payload.subscription.entity;

//     switch (event) {
//       case 'subscription.charged':
//         console.log('✓ Subscription charged:', data.id);
//         await Subscription.updateOne(
//           { razorpaySubscriptionId: data.id },
//           {
//             status: 'active',
//             renewalCount: (await Subscription.findOne({
//               razorpaySubscriptionId: data.id,
//             })).renewalCount + 1,
//           }
//         );
//         break;

//       case 'subscription.failed':
//         console.log('✗ Subscription payment failed:', data.id);
//         await Subscription.updateOne(
//           { razorpaySubscriptionId: data.id },
//           { status: 'failed' }
//         );
//         break;

//       case 'subscription.cancelled':
//         console.log('✗ Subscription cancelled:', data.id);
//         await Subscription.updateOne(
//           { razorpaySubscriptionId: data.id },
//           {
//             status: 'cancelled',
//             endDate: new Date(),
//           }
//         );
//         break;
//     }

//     res.status(200).json({ status: 'ok' });
//   } catch (error) {
//     console.error('Webhook error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };


// module.exports = {
//   getPlans,
//   createSubscription,
//   verifyPayment,
//   getUserSubscription,
//   getSubscriptionHistory,
//   pauseSubscription,
//   resumeSubscription,
//   cancelSubscription,
//   handleWebhook,
// };