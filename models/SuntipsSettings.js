const mongoose = require("mongoose");

const suntipsSettingsSchema = new mongoose.Schema(
  {
    outOfStock: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SuntipsSettings = mongoose.model("SuntipsSettings", suntipsSettingsSchema, "SuntipsSettings");

module.exports = SuntipsSettings;
