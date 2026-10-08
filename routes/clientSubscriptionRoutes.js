const express = require("express");
const router = express.Router();
const controller = require("../controllers/clientSubscriptionController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

// ─── Admin ───────────────────────────────────────────────────────────────
router.get("/admin/clients", userAuthentication, isAdmin, controller.getClientUsers);
router.post("/admin/clients", userAuthentication, isAdmin, controller.createClientUser);
router.post("/admin", userAuthentication, isAdmin, controller.createSubscription);
router.get("/admin", userAuthentication, isAdmin, controller.getAllSubscriptions);
router.get("/admin/history", userAuthentication, isAdmin, controller.getAllPaymentHistory);
router.get("/admin/payment-links", userAuthentication, isAdmin, controller.getPaymentLinkTransactions);
router.get("/admin/:id", userAuthentication, isAdmin, controller.getSubscriptionById);
router.patch("/admin/:id/pause", userAuthentication, isAdmin, controller.pauseSubscription);
router.patch("/admin/:id/resume", userAuthentication, isAdmin, controller.resumeSubscription);
router.patch("/admin/:id/cancel", userAuthentication, isAdmin, controller.cancelSubscription);

// ─── Client ──────────────────────────────────────────────────────────────
router.get("/me", userAuthentication, controller.getMySubscription);
router.get("/me/history", userAuthentication, controller.getMyPaymentHistory);
router.get("/me/payment-links", userAuthentication, controller.getMyPaymentLinkTransactions);
router.post("/me/verify", userAuthentication, controller.verifyMySubscription);

// ─── Webhook (Razorpay) — no auth, signature verified in controller ──────
router.post("/webhook", controller.handleWebhook);

module.exports = router;
