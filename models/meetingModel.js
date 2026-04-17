const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    selectedService: {
      type: String,
      required: true,
    },
    userDate: {
      type: Date,
      required: true,
    },
    partnerName: {
      type: String,
      required: true,
    },
    partnerEmail: {
      type: String,
      required: true,
    },
    gmeetLink: {
      type: String,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = Meeting;
