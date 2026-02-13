
// const express = require('express');
// const subscriptionRouter = express.Router();
// const subscriptionController = require('../controllers/subscriptionController');
// const userAuthentication = require('../middlewares/userAuthentication');

// // Get all plans
// subscriptionRouter.get('/plans', subscriptionController.getPlans);

// // Create subscription (protected)
// subscriptionRouter.post('/create', userAuthentication, subscriptionController.createSubscription);

// // Verify payment (protected)
// subscriptionRouter.post('/verify',userAuthentication, subscriptionController.verifyPayment);

// // Get user's current subscription (protected)
// subscriptionRouter.get('/current', userAuthentication, subscriptionController.getUserSubscription);

// // Get subscription history (protected)
// subscriptionRouter.get('/history',userAuthentication, subscriptionController.getSubscriptionHistory);

// // Pause subscription (protected)
// subscriptionRouter.post('/pause', userAuthentication, subscriptionController.pauseSubscription);

// // Resume subscription (protected)
// subscriptionRouter.post('/resume', userAuthentication, subscriptionController.resumeSubscription);

// // Cancel subscription (protected)
// subscriptionRouter.post('/cancel',userAuthentication, subscriptionController.cancelSubscription);

// // Webhook (no auth needed - but signature verified)
// subscriptionRouter.post('/webhook', subscriptionController.handleWebhook);

// module.exports = subscriptionRouter;