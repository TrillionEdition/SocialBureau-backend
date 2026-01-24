const express = require("express");
const router = express.Router();
const {
    addCompanyAchievement,
    getAllCompanyAchievements,
    updateCompanyAchievement,
    deleteCompanyAchievement,
} = require("../controllers/companyAchievementController");

router.post("/", addCompanyAchievement);
router.get("/", getAllCompanyAchievements);
router.put("/:id", updateCompanyAchievement);
router.delete("/:id", deleteCompanyAchievement);

module.exports = router;
