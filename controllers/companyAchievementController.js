const CompanyAchievement = require("../models/companyAchievementModel");

// Add a company achievement
exports.addCompanyAchievement = async (req, res) => {
    try {
        const { title, description, date, image, category } = req.body;

        if (!title || !description || !date || !image) {
            return res.status(400).json({
                success: false,
                message: "Title, description, date and image are required",
            });
        }

        const achievement = new CompanyAchievement({
            title,
            description,
            date,
            image,
            category,
        });

        await achievement.save();

        res.status(201).json({
            success: true,
            message: "Company achievement added successfully",
            data: achievement,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get all company achievements
exports.getAllCompanyAchievements = async (req, res) => {
    try {
        const achievements = await CompanyAchievement.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: achievements,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update a company achievement
exports.updateCompanyAchievement = async (req, res) => {
    try {
        const { id } = req.params;
        const achievement = await CompanyAchievement.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: "Achievement not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Achievement updated successfully",
            data: achievement,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete a company achievement
exports.deleteCompanyAchievement = async (req, res) => {
    try {
        const { id } = req.params;
        const achievement = await CompanyAchievement.findByIdAndDelete(id);

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: "Achievement not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Achievement deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
