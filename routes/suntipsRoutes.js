const express = require("express");
const suntipsController = require("../controllers/suntipsController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const suntipsRoutes = express.Router();

// Public: Submit a claim
suntipsRoutes.post("/claim", suntipsController.createClaim);

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

module.exports = suntipsRoutes;
