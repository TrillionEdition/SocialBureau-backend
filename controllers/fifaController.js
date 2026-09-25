// FIFA feature temporarily disabled — controllers retained but will return 503.
// Keeping files intact so re-enabling later is simple and safe.
const FifaMatch = require("../models/FifaMatchModel");
const FifaPrediction = require("../models/FifaPredictionModel");
const User = require("../models/userModel");

// Helper: respond with service unavailable for disabled FIFA endpoints
const serviceUnavailable = (res, message = "FIFA feature temporarily disabled") => {
  return res.status(503).json({ message });
};

// 1. Get all matches (Public)
exports.getMatches = async (req, res) => {
  return serviceUnavailable(res);
};

// 2. Get active Hero match (Public)
exports.getHeroMatch = async (req, res) => {
  return serviceUnavailable(res);
};

// 3. Submit a prediction (Authenticated user)
exports.submitPrediction = async (req, res) => {
  return serviceUnavailable(res, "FIFA predictions are temporarily disabled");
};

// 4. Get predictions placed by current user (Authenticated user)
exports.getMyPredictions = async (req, res) => {
  return serviceUnavailable(res, "FIFA predictions are temporarily disabled");
};

// 5. Get predictions leaderboard (Public)
exports.getLeaderboard = async (req, res) => {
  return serviceUnavailable(res);
};

// 6. Get leaderboard based on total votes cast (Public)
exports.getVotesLeaderboard = async (req, res) => {
  return serviceUnavailable(res);
};

// 7. Get all predictions (Public/Admin)
exports.getAllPredictions = async (req, res) => {
  return serviceUnavailable(res);
};
