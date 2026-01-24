const express = require("express");
const {
    addAchievement,
    getUserAchievements,
    updateAchievement,
    deleteAchievement,
    getUserDetails } = require("../controllers/achievementController")

const upload = require("../middlewares/cloudinary");
const achievementRouter = express.Router();

// Achievement CRUD operations
achievementRouter.post("/add", upload.single("image"), addAchievement);
achievementRouter.get("/user/:userId", getUserAchievements);
achievementRouter.put("/:achievementId", updateAchievement);
achievementRouter.delete("/:achievementId", deleteAchievement);

// Get user details (this is what your frontend calls)
achievementRouter.get("/user-details/:name", getUserDetails);

module.exports = achievementRouter;