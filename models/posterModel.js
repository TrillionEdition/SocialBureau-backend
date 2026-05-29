const mongoose = require("mongoose");

const posterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    date: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      required: true,
    },
    mobileImage: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Festival",
      enum: ["Festival", "Hiring", "Achievement", "Environment", "Holiday", "Other"],
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

const Poster = mongoose.model("Poster", posterSchema);

module.exports = Poster;
