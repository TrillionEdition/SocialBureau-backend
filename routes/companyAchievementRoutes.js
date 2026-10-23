const express = require("express");
const companyAchievementRoutes = express.Router();
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");
const {
    addCompanyAchievement,
    getAllCompanyAchievements,
    updateCompanyAchievement,
    deleteCompanyAchievement,
} = require("../controllers/companyAchievementController");

companyAchievementRoutes.post("/", userAuthentication, isAdmin, addCompanyAchievement);
companyAchievementRoutes.get("/", getAllCompanyAchievements);
companyAchievementRoutes.put("/:id", userAuthentication, isAdmin, updateCompanyAchievement);
companyAchievementRoutes.delete("/:id", userAuthentication, isAdmin, deleteCompanyAchievement);

module.exports = companyAchievementRoutes;
