const mongoose = require("mongoose");

const fifaPredictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FifaMatch",
      required: true,
      index: true,
    },
    predictedWinner: {
      type: String,
      enum: ["TeamA", "TeamB", "Draw"],
      required: true,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate predictions for the same match by the same user
fifaPredictionSchema.index({ user: 1, match: 1 }, { unique: true });

const FifaPrediction = mongoose.model("FifaPrediction", fifaPredictionSchema);

module.exports = FifaPrediction;
