const express = require("express");
const suntipsController = require("../controllers/suntipsController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const suntipsRoutes = express.Router();

// Public: Submit a claim
suntipsRoutes.post("/claim", suntipsController.createClaim);

// Public: Get Suntips settings (outOfStock flag) — polled by spin page
suntipsRoutes.get("/settings", suntipsController.getSettings);

// Admin: Get all claims
suntipsRoutes.get(
  "/claims",
  userAuthentication,
  isAdmin,
  suntipsController.getClaims
);

// Admin: Update claim status (Mark as Shipped/Delivered)
suntipsRoutes.patch(
  "/claims/:id",
  userAuthentication,
  isAdmin,
  suntipsController.updateClaimStatus
);

// Admin: Toggle outOfStock status
suntipsRoutes.patch(
  "/settings/stock",
  userAuthentication,
  isAdmin,
  suntipsController.updateStockStatus
);

module.exports = suntipsRoutes;
