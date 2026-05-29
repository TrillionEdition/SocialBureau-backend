const express = require("express");
const lotteryController = require("../controllers/lotteryController");
const upload = require("../middlewares/cloudflare");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const lotteryRoutes = express.Router();

// Public: Submit a claim (Upload GPay QR Code file with name 'qrCode')
lotteryRoutes.post(
  "/claim",
  upload.single("qrCode", "socialbureau-media/images/lottery"),
  lotteryController.createClaim
);

// Admin: Get all claims
lotteryRoutes.get(
  "/claims",
  userAuthentication,
  isAdmin,
  lotteryController.getClaims
);

// Admin: Update claim status (Mark as Paid/Pending)
lotteryRoutes.patch(
  "/claims/:id",
  userAuthentication,
  isAdmin,
  lotteryController.updateClaimStatus
);

// Public: Get lottery settings
lotteryRoutes.get(
  "/settings",
  lotteryController.getSettings
);

// Admin: Update lottery settings
lotteryRoutes.post(
  "/settings",
  userAuthentication,
  isAdmin,
  lotteryController.updateSettings
);

module.exports = lotteryRoutes;
