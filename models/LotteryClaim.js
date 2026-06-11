const mongoose = require("mongoose");

const treasureHuntSchema = new mongoose.Schema(
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
    qrCode: {
      type: String,
      trim: true,
    },
    totalTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const TreasureHunt = mongoose.model("TreasureHunt", treasureHuntSchema, "TreasureHunt");

module.exports = TreasureHunt;

