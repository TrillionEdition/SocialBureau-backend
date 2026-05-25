const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    bgText: String,
    description: String,
    image: String,
    cardImage: String,
    image1: String,
    idCard: String,
    tags: [String],
    category: [String],
    bgColor: {
      type: String,
      default: "#ff3358"
    },
    hasBakedText: {
      type: Boolean,
      default: true
    },
    socials: {
      linkedin: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" }
    },
    consultations: {
      price30Min: { type: String, default: "" },
      price60Min: { type: String, default: "" },
      priceFullDay: { type: String, default: "" }
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", teamMemberSchema);
