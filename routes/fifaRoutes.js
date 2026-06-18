const express = require("express");
const fifaController = require("../controllers/fifaController");
const userAuthentication = require("../middlewares/userAuthentication");

const fifaRoutes = express.Router();

// Public routes
fifaRoutes.get("/matches", fifaController.getMatches);
fifaRoutes.get("/hero-match", fifaController.getHeroMatch);
fifaRoutes.get("/leaderboard", fifaController.getLeaderboard);
fifaRoutes.get("/votes-leaderboard", fifaController.getVotesLeaderboard);
fifaRoutes.get("/all-predictions", fifaController.getAllPredictions);

// Authenticated routes
fifaRoutes.post("/predict", userAuthentication, fifaController.submitPrediction);
fifaRoutes.get("/my-predictions", userAuthentication, fifaController.getMyPredictions);

module.exports = fifaRoutes;
