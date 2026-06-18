const SuntipsClaim = require("../models/SuntipsClaim");

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
