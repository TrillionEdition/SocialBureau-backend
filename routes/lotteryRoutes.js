const express = require("express");
// Lottery routes disabled — router returns 503 on all paths to avoid breaking imports.
const lotteryController = require("../controllers/lotteryController");
const lotteryRoutes = express.Router();

lotteryRoutes.use((req, res) => lotteryController.getSettings(req, res));

module.exports = lotteryRoutes;
