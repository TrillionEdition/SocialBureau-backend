const express = require("express");
const reelController = require("../controllers/reelController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const reelRoutes = express.Router();

// ✅ Public route: get all reels (frontend home page uses ?active=true)
reelRoutes.get("/", reelController.getAllReels);

// 🔒 Protected admin routes
reelRoutes.post("/", userAuthentication, isAdmin, reelController.addReel);
reelRoutes.put("/:id", userAuthentication, isAdmin, reelController.updateReel);
reelRoutes.delete("/:id", userAuthentication, isAdmin, reelController.deleteReel);

module.exports = reelRoutes;
