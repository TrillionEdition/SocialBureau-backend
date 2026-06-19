const SuntipsClaim = require("../models/SuntipsClaim");
const SuntipsSettings = require("../models/SuntipsSettings");

// Create a claim for a tea pack
exports.createClaim = async (req, res) => {
  try {
    const { name, mobileNumber, address, prize } = req.body;

    if (!name || !mobileNumber || !prize) {
      return res.status(400).json({ message: "Name, Mobile Number, and Prize are required" });
    }

    const newClaim = new SuntipsClaim({
      name,
      mobileNumber,
      address,
      prize,
      status: "Pending",
    });

    await newClaim.save();

    res.status(201).json({
      message: "Suntips Tea claim submitted successfully!",
      claim: newClaim,
    });
  } catch (error) {
    console.error("Error creating Suntips claim:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all claims (Admin only)
exports.getClaims = async (req, res) => {
  try {
    const claims = await SuntipsClaim.find().sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    console.error("Error fetching Suntips claims:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Update claim status (Admin only)
exports.updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Shipped", "Delivered"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedClaim = await SuntipsClaim.findByIdAndUpdate(
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
    console.error("Error updating Suntips claim status:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get Suntips settings (public - for the spin page to check outOfStock status)
exports.getSettings = async (req, res) => {
  try {
    let settings = await SuntipsSettings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await SuntipsSettings.create({ outOfStock: false });
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching Suntips settings:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Update outOfStock flag (Admin only)
exports.updateStockStatus = async (req, res) => {
  try {
    const { outOfStock } = req.body;

    if (typeof outOfStock !== "boolean") {
      return res.status(400).json({ message: "outOfStock must be a boolean" });
    }

    let settings = await SuntipsSettings.findOne();
    if (!settings) {
      settings = new SuntipsSettings({ outOfStock });
    } else {
      settings.outOfStock = outOfStock;
    }
    await settings.save();

    res.status(200).json({ message: `Stock status updated`, outOfStock: settings.outOfStock });
  } catch (error) {
    console.error("Error updating Suntips stock status:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
