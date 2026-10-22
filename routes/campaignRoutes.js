const express = require("express");
const { rateLimit } = require("express-rate-limit");
const controller = require("../controllers/campaignController");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/adminAuthentication");
const youtubeAnalyticsController = require("../controllers/youtubeAnalyticsController");
const walletController = require("../controllers/walletController");

const router = express.Router();
const campaignLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });
const campaignAnalyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
});
const optionalAuth = (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  const header = req.headers.authorization;
  if (!token && !header) return next();
  return userAuthentication(req, res, next);
};
const adminOnly = [userAuthentication, adminAuthentication];

router.post("/campaigns", campaignLimiter, optionalAuth, controller.createCampaign);
router.post("/payments/create-order", campaignLimiter, optionalAuth, controller.createOrder);
router.post("/payments/verify", campaignLimiter, controller.verifyPayment);
router.post("/payments/webhook", controller.webhook);
router.post("/payments/wallet-pay", campaignLimiter, userAuthentication, controller.payWithWallet);
router.get("/wallet", userAuthentication, walletController.getWallet);
router.post("/wallet/topup/order", campaignLimiter, userAuthentication, walletController.createTopupOrder);
router.post("/wallet/topup/verify", campaignLimiter, userAuthentication, walletController.verifyTopup);
router.get("/campaigns/pricing", controller.getPricing);
router.post("/campaigns/quote", controller.getCampaignQuote);
router.get("/campaigns/admin/pricing", ...adminOnly, controller.getCampaignRates);
router.patch("/campaigns/admin/pricing", ...adminOnly, controller.updateCampaignRates);
router.get("/campaigns/admin", ...adminOnly, controller.adminList);
router.get("/campaigns/admin/export", ...adminOnly, controller.exportCsv);
router.patch("/campaigns/admin/:bookingId", ...adminOnly, controller.adminUpdate);
router.get("/campaigns/mine", userAuthentication, controller.getClientCampaigns);
router.get("/campaigns", userAuthentication, controller.getOwnCampaigns);
router.get("/campaigns/youtube/callback", youtubeAnalyticsController.oauthCallback);
router.get("/campaigns/:campaignId/youtube/connect", userAuthentication, youtubeAnalyticsController.startOAuth);
router.post("/campaigns/:campaignId/youtube/disconnect", userAuthentication, youtubeAnalyticsController.disconnect);
router.get("/campaigns/:campaignId/youtube/analytics", userAuthentication, campaignAnalyticsLimiter, youtubeAnalyticsController.getPrivateAnalytics);
router.get("/campaigns/:campaignId/analytics", userAuthentication, campaignAnalyticsLimiter, controller.getCampaignAnalytics);
router.get("/campaigns/:bookingId", optionalAuth, controller.getCampaign);

module.exports = router;