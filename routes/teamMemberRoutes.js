const express = require("express");
const router = express.Router();
const { getMyProfile, updateMyProfile, getAllTeamMembers } = require("../controllers/teamMemberController");
const { protect } = require("../middleware/authMiddleware");

// Public route to get all team members for the Team page
router.get("/public", getAllTeamMembers);

// Protected routes for employees to manage their own data
router.use(protect);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);

module.exports = router;
