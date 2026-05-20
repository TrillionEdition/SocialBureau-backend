const mongoose = require("mongoose");

const lotteryClaimSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: String,
      required: true,
      trim: true,
    },
    gpayNumber: {
      type: String,
      trim: true,
    },
    qrCode: {
      type: String,
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

const LotteryClaim = mongoose.model("LotteryClaim", lotteryClaimSchema);

module.exports = LotteryClaim;
