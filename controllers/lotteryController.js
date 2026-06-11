const LotteryClaim = require("../models/LotteryClaim");
const LotterySettings = require("../models/LotterySettings");

// Claim a treasure hunt prize
exports.createClaim = async (req, res) => {
  try {
    const { name, mobileNumber, totalTime } = req.body;
    
    if (!name || !mobileNumber || !totalTime) {
      return res.status(400).json({ message: "Name, Mobile Number, and Total Time are required" });
    }

    let qrCodeUrl = "";
    if (req.file && req.file.location) {
      qrCodeUrl = req.file.location; // Cloudflare R2 uploaded image URL
    }

    const newClaim = new LotteryClaim({
      name,
      mobileNumber,
      totalTime,
      qrCode: qrCodeUrl,
      status: "Pending",
    });

    await newClaim.save();
    
    res.status(201).json({
      message: "Treasure Hunt details submitted successfully!",
      claim: newClaim,
    });
  } catch (error) {
    console.error("Error creating treasure hunt claim:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all claims (Admin only)
exports.getClaims = async (req, res) => {
  try {
    const claims = await LotteryClaim.find().sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    console.error("Error fetching lottery claims:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Update claim status (Admin only)
exports.updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Paid"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedClaim = await LotteryClaim.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedClaim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    res.status(200).json({
      message: `Claim status updated to ${status}`,
      claim: updatedClaim,
    });
  } catch (error) {
    console.error("Error updating claim status:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get lottery settings (Publicly accessible)
exports.getSettings = async (req, res) => {
  try {
    let settings = await LotterySettings.findOne();
    if (!settings) {
      // Create default settings doc if none exists
      settings = new LotterySettings({
        showLotteryOnHomeStart: null,
        showLotteryOnHomeEnd: null,
        isActive: false,
      });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching lottery settings:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Update lottery settings (Admin only)
exports.updateSettings = async (req, res) => {
  try {
    const { showLotteryOnHomeStart, showLotteryOnHomeEnd, isActive } = req.body;

    let settings = await LotterySettings.findOne();
    if (!settings) {
      settings = new LotterySettings();
    }

    settings.showLotteryOnHomeStart = showLotteryOnHomeStart ? new Date(showLotteryOnHomeStart) : null;
    settings.showLotteryOnHomeEnd = showLotteryOnHomeEnd ? new Date(showLotteryOnHomeEnd) : null;
    settings.isActive = isActive !== undefined ? isActive : false;

    await settings.save();

    res.status(200).json({
      message: "Lottery settings updated successfully!",
      settings,
    });
  } catch (error) {
    console.error("Error updating lottery settings:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get public leaderboard of completions (sorted by fastest time first)
exports.getPublicLeaderboard = async (req, res) => {
  try {
    const claims = await LotteryClaim.find({}, "name totalTime status createdAt");
    
    // Sort logic: totalTime is stored as "MM:SS" or "HH:MM:SS".
    const parseTimeToSeconds = (timeStr) => {
      if (!timeStr) return Infinity;
      const parts = timeStr.split(":").map(Number);
      if (parts.some(isNaN)) return Infinity;
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return Infinity;
    };

    const sortedClaims = claims
      .map(c => ({
        _id: c._id,
        name: c.name,
        totalTime: c.totalTime,
        status: c.status,
        createdAt: c.createdAt,
        seconds: parseTimeToSeconds(c.totalTime)
      }))
      .sort((a, b) => a.seconds - b.seconds);

    res.status(200).json(sortedClaims);
  } catch (error) {
    console.error("Error fetching public leaderboard:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

