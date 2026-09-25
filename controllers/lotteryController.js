// Lottery feature temporarily disabled — controllers retained but will return 503.
const LotteryClaim = require("../models/LotteryClaim");
const LotterySettings = require("../models/LotterySettings");

// Helper: respond with service unavailable for disabled Lottery endpoints
const serviceUnavailable = (res, message = "Lottery feature temporarily disabled") => {
  return res.status(503).json({ message });
};

// Claim a treasure hunt prize
exports.createClaim = async (req, res) => {
  return serviceUnavailable(res, "Lottery claims are temporarily disabled");
};

// Get all claims (Admin only)
exports.getClaims = async (req, res) => {
  return serviceUnavailable(res);
};

// Update claim status (Admin only)
exports.updateClaimStatus = async (req, res) => {
  return serviceUnavailable(res);
};

// Get lottery settings (Publicly accessible)
exports.getSettings = async (req, res) => {
  return serviceUnavailable(res);
};

// Update lottery settings (Admin only)
exports.updateSettings = async (req, res) => {
  return serviceUnavailable(res);
};

// Get public leaderboard of completions (sorted by fastest time first)
exports.getPublicLeaderboard = async (req, res) => {
  return serviceUnavailable(res);
};

