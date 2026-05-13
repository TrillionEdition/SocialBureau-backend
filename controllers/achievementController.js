const mongoose = require("mongoose");
const Achievement = require("../models/achievementModel");
const User = require("../models/userModel");
const { getCache, setCache, invalidateCache, CACHE_EXPIRY } = require("../utils/Cacheutils");

// Add a new achievement
const addAchievement = async (req, res) => {
    try {
        const { title, description, image, userId, email, name } = req.body;

        // Validate required fields
        if (!title || (!userId && !email && !name)) {
            return res.status(400).json({
                success: false,
                message: "Title and a user identifier (userId/id, email, or name) are required"
            });
        }

        // Find the user first to ensure we have the correct ObjectId
        let user;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        }

        // If not found by ID, try email, name, or emp_id (using userId field as fallback)
        if (!user) {
            user = await User.findOne({
                $or: [
                    { email: email || userId },
                    { name: name || userId },
                    { emp_id: userId }
                ].filter(obj => Object.values(obj)[0]) // filter out empty values
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please provide a valid userId (ObjectId), email, name, or employee ID."
            });
        }

        // Use uploaded file path if available, otherwise use image URL from body
        const imageUrl = req.file ? req.file.location : image;

        // Create new achievement
        const achievement = new Achievement({
            user: user._id, // Use the correct ObjectId
            title,
            description: description || "",
            image: imageUrl || null
        });

        await achievement.save();

        // Add achievement to user's achievements array
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $push: { achievements: achievement._id } },
            { new: true }
        ).populate('achievements');

        // Invalidate cache
        await invalidateCache([`user:achievements:${user._id}`, `user:details:${user.name.trim().toLowerCase()}`]);

        res.status(201).json({
            success: true,
            message: "Achievement added successfully",
            achievement,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                achievementsCount: updatedUser.achievements.length,
                achievements: updatedUser.achievements
            }
        });
    } catch (error) {
        console.error("Error in addAchievement:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all achievements for a user
const getUserAchievements = async (req, res) => {
    try {
        const { userId } = req.params;
        const cacheKey = `user:achievements:${userId}`;

        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.status(200).json({
                success: true,
                data: cachedData
            });
        }

        const achievements = await Achievement.find({ user: userId })
            .sort({ createdAt: -1 });

        await setCache(cacheKey, achievements, CACHE_EXPIRY.USER_DATA);

        res.status(200).json({
            success: true,
            data: achievements
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update an achievement
const updateAchievement = async (req, res) => {
    try {
        const { achievementId } = req.params;
        const { title, description, image } = req.body;

        const achievement = await Achievement.findByIdAndUpdate(
            achievementId,
            {
                title: title || undefined,
                description: description !== undefined ? description : undefined,
                image: image !== undefined ? image : undefined
            },
            { new: true, runValidators: true }
        );

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: "Achievement not found"
            });
        }

        // Invalidate cache
        const user = await User.findById(achievement.user);
        if (user) {
            await invalidateCache([`user:achievements:${user._id}`, `user:details:${user.name.trim().toLowerCase()}`]);
        }

        res.status(200).json({
            success: true,
            message: "Achievement updated successfully",
            data: achievement
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete an achievement
const deleteAchievement = async (req, res) => {
    try {
        const { achievementId } = req.params;

        const achievement = await Achievement.findByIdAndDelete(achievementId);

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: "Achievement not found"
            });
        }

        // Remove achievement from user's achievements array
        await User.findByIdAndUpdate(
            achievement.user,
            { $pull: { achievements: achievementId } },
            { new: true }
        );

        // Invalidate cache
        const user = await User.findById(achievement.user);
        if (user) {
            await invalidateCache([`user:achievements:${achievement.user}`, `user:details:${user.name.trim().toLowerCase()}`]);
        }

        res.status(200).json({
            success: true,
            message: "Achievement deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get user details with achievements (for staff dashboard)
const getUserDetails = async (req, res) => {
    try {
        const { name } = req.params;
        const cacheKey = `user:details:${name.trim().toLowerCase()}`;

        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.status(200).json(cachedData);
        }

        const user = await User.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
        })
            .populate({
                path: 'achievements',
                select: 'title description image createdAt'
            })
            .populate({
                path: 'reviews',
                select: 'review rating name company createdAt'
            })
            .populate({
                path: 'clients',
                select: 'name logo website'
            })
            .populate({
                path: 'tools',
                select: 'toolName icon url'
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Fallback: If achievements array is empty in user doc, check the Achievement collection directly
        if (!user.achievements || user.achievements.length === 0) {
            const directAchievements = await Achievement.find({ user: user._id })
                .select("title description image createdAt")
                .lean();
            if (directAchievements.length > 0) {
                user.achievements = directAchievements;
            }
        }

        // Optionally get ClickUp data if you have that
        const clickupData = {
            tasks: user.tasks || 0,
            totalHours: user.totalHours || 0
        };

        const responseData = {
            success: true,
            user,
            clickup: clickupData
        };

        await setCache(cacheKey, responseData, CACHE_EXPIRY.USER_DATA);

        res.status(200).json(responseData);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    addAchievement,
    getUserAchievements,
    updateAchievement,
    deleteAchievement,
    getUserDetails
};