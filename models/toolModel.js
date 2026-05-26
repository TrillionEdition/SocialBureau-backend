const mongoose = require("mongoose");

const toolSchema = new mongoose.Schema(
  {
    toolName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    url: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/i, "Please provide a valid URL (must start with http:// or https://)"],
      index: true,
    },
    icon: { type: String, trim: true },
    description: { type: String, trim: true },
    level: { type: Number, default: 85 },
  },
  {
    timestamps: true,
  }
);

const Tool = mongoose.model("Tool", toolSchema);

module.exports = Tool;