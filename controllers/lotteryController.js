const LotteryClaim = require("../models/LotteryClaim");

// Claim a lottery prize
exports.createClaim = async (req, res) => {
  try {
    const { name, amount, gpayNumber } = req.body;
    
    if (!name || !amount) {
      return res.status(400).json({ message: "Name and Amount are required" });
    }

    let qrCodeUrl = "";
    if (req.file && req.file.location) {
      qrCodeUrl = req.file.location; // Cloudflare R2 uploaded image URL
    }

    const newClaim = new LotteryClaim({
      name,
      amount,
      gpayNumber,
      qrCode: qrCodeUrl,
      status: "Pending",
    });

    await newClaim.save();
    
    res.status(201).json({
      message: "Lottery claim submitted successfully!",
      claim: newClaim,
    });
  } catch (error) {
    console.error("Error creating lottery claim:", error);
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
