const express = require("express");
const companyAchievementRoutes = express.Router();
const {
    addCompanyAchievement,
    getAllCompanyAchievements,
    updateCompanyAchievement,
    deleteCompanyAchievement,
} = require("../controllers/companyAchievementController");

companyAchievementRoutes.post("/", addCompanyAchievement);
companyAchievementRoutes.get("/", getAllCompanyAchievements);
companyAchievementRoutes.put("/:id", updateCompanyAchievement);
companyAchievementRoutes.delete("/:id", deleteCompanyAchievement);

module.exports = companyAchievementRoutes;
