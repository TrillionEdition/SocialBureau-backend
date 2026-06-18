const mongoose = require("mongoose");

const fifaMatchSchema = new mongoose.Schema(
  {
    apiMatchId: {
      type: Number,
      unique: true,
      required: true,
      index: true,
    },
    teamA: {
      type: String,
      required: true,
      trim: true,
    },
    teamB: {
      type: String,
      required: true,
      trim: true,
    },
    teamACrest: {
      type: String,
      trim: true,
    },
    teamBCrest: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    kickoffTime: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Live", "Completed"],
      default: "Scheduled",
      index: true,
    },
    winner: {
      type: String,
      enum: ["TeamA", "TeamB", "Draw", null],
      default: null,
    },
    scores: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    teamAVotes: {
      type: Number,
      default: 0,
    },
    teamBVotes: {
      type: Number,
      default: 0,
    },
    drawVotes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const FifaMatch = mongoose.model("FifaMatch", fifaMatchSchema);

module.exports = FifaMatch;
