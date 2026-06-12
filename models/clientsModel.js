const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      index: true,
    },

    companyName: {
      type: String,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-() ]+$/, "Invalid phone number format"],
    },

    website: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/i,
        "Please provide a valid URL (must start with http:// or https://)",
      ],
    },

    logo: {
      type: String, // store URL or file path
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    isAuditClient: {
      type: Boolean,
      default: false,
      index: true,
    },

    password: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model("Client", clientSchema);

module.exports = Client;
