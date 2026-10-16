const mongoose = require("mongoose");

const youtubeOAuthStateSchema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clientEmail: { type: String, default: "" },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

youtubeOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("YouTubeOAuthState", youtubeOAuthStateSchema);