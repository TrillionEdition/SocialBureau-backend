const mongoose = require("mongoose");

const youtubeConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  channelId: { type: String, required: true },
  channelName: { type: String, default: "" },
  refreshTokenCiphertext: { type: String, required: true, select: false },
  refreshTokenIv: { type: String, required: true, select: false },
  refreshTokenAuthTag: { type: String, required: true, select: false },
  connectedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: null },
}, { timestamps: true });

youtubeConnectionSchema.index({ userId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model("YouTubeConnection", youtubeConnectionSchema);