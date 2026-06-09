const mongoose = require("mongoose");

const partnershipSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    param: {
      type: String,
      required: [true, "URL param is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "active",
    },
    tags: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
    subtitle: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "partnership",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    details: {
      type: Object,
      default: {},
    },
    templateId: {
      type: String,
      default: "template1",
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    hasPaid: {
      type: Boolean,
      default: false,
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Partnership = mongoose.model("Partnership", partnershipSchema);

module.exports = Partnership;
