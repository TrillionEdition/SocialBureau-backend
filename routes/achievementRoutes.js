const express = require("express");
const {
    addAchievement,
    getUserAchievements,
    updateAchievement,
    deleteAchievement,
    getUserDetails } = require("../controllers/achievementController")

const upload = require("../middlewares/cloudflare");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");
const achievementRouter = express.Router();

// Achievement CRUD operations...
achievementRouter.post("/add", userAuthentication, isAdmin, upload.single("image"), addAchievement);
achievementRouter.get("/user/:userId", getUserAchievements);
achievementRouter.put("/:achievementId", userAuthentication, isAdmin, updateAchievement);
achievementRouter.delete("/:achievementId", userAuthentication, isAdmin, deleteAchievement);

// Get user details (this is what your frontend calls)
achievementRouter.get("/user-details/:name", getUserDetails);

module.exports = achievementRouter;