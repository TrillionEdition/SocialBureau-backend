const ChocochiRegistration = require("../models/ChocochiRegistration");

// Create a new registration
exports.createRegistration = async (req, res) => {
  try {
    const { name, mobileNumber, chestNumber } = req.body;

    if (!name || !mobileNumber || !chestNumber) {
      return res.status(400).json({ message: "Name, Mobile Number, and Chest Number are required" });
    }

    const newReg = new ChocochiRegistration({
      name,
      mobileNumber,
      chestNumber,
    });

    await newReg.save();

    res.status(201).json({
      message: "Chocochi registration submitted successfully!",
      registration: newReg,
    });
  } catch (error) {
    console.error("Error creating Chocochi registration:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all registrations
exports.getRegistrations = async (req, res) => {
  try {
    const registrations = await ChocochiRegistration.find().sort({ createdAt: -1 });
    res.status(200).json(registrations);
  } catch (error) {
    console.error("Error fetching Chocochi registrations:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
