const mongoose = require("mongoose");

const chocochiRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    chestNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ChocochiRegistration = mongoose.model(
  "ChocochiRegistration",
  chocochiRegistrationSchema,
  "ChocochiRegistrations"
);

module.exports = ChocochiRegistration;
