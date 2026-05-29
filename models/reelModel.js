const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Reel = mongoose.model("Reel", reelSchema);

module.exports = Reel;
