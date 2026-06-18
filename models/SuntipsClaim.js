const mongoose = require("mongoose");

const suntipsClaimSchema = new mongoose.Schema(
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
    address: {
      type: String,
      required: false,
      trim: true,
    },
    prize: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const SuntipsClaim = mongoose.model("SuntipsClaim", suntipsClaimSchema, "SuntipsClaims");

module.exports = SuntipsClaim;
