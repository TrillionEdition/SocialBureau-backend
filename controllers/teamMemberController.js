const TeamMember = require("../models/teamMemberModel");
const User = require("../models/userModel");

// Get current user's team member profile
exports.getMyProfile = async (req, res) => {
  try {
    let profile = await TeamMember.findOne({ user: req.user._id });
    
    // If no profile exists yet, return empty object or initial data from User model
    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          name: req.user.name,
          email: req.user.email,
          isNew: true
        }
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create or update team member profile
exports.updateMyProfile = async (req, res) => {
  try {
    const {
      name,
      role,
      bgText,
      image,
      cardImage,
      image1,
      idCard,
      tags,
      category,
      bgColor,
      hasBakedText,
      socials
    } = req.body;

    let profile = await TeamMember.findOne({ user: req.user._id });

    if (profile) {
      // Update existing
      profile = await TeamMember.findOneAndUpdate(
        { user: req.user._id },
        {
          name,
          role,
          bgText,
          image,
          cardImage,
          image1,
          idCard,
          tags,
          category,
          bgColor,
          hasBakedText,
          socials
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new
      profile = await TeamMember.create({
        user: req.user._id,
        name,
        role,
        bgText,
        image,
        cardImage,
        image1,
        idCard,
        tags,
        category,
        bgColor,
        hasBakedText,
        socials
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all public team members (for the public Team page)
exports.getAllTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find({ isPublic: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
