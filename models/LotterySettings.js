const mongoose = require("mongoose");

const lotterySettingsSchema = new mongoose.Schema(
  {
    showLotteryOnHomeStart: {
      type: Date,
      default: null,
    },
    showLotteryOnHomeEnd: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const LotterySettings = mongoose.model("LotterySettings", lotterySettingsSchema);

module.exports = LotterySettings;
