const mongoose = require("mongoose");

const companyAchievementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            default: "Milestone",
        },
    },
    {
        timestamps: true,
    }
);

const CompanyAchievement = mongoose.model("CompanyAchievement", companyAchievementSchema);

module.exports = CompanyAchievement;
