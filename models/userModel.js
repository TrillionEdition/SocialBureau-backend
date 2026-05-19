const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    emp_id: {
      type: String
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minLength: [5, "Minimum 5 characters required"]
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    verification: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: Number,
    },
    // Allow multiple tools (e.g., Word, ClickUp, etc.)
    tools: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tool",
      },
    ],
    isEmployee:
    {
      type: Boolean,
      default: false,
    },

    clients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },
    ],

    // ClickUp ID (optional). Indexed for fast lookup; make unique if your app requires one-to-one mapping.
    clickupId: {
      type: String,
      index: true,
    },

    clickupListId: {
      type: String,
      index: true,
    },

    clickupChatViewId: {
      type: String,
      index: true,
    },

    clickupToken: {
      type: String,
    },

    // Multiple reviews authored/associated with this user
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],

    // Multiple achievements (reference the Achievement model)
    achievements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Achievement",
      },
    ],
    coverImage: {
      type: String
    },
    role: {
      type: String,
      default: "partnership",
    },
    rating: {
      type: Number
    },
    rate: {
      type: Number
    },
    exp: {
      type: String
    },
    idCard: {
      type: String
    },
    doj: {
      type: Date
    },

    // === Engagement & Leaderboard (SAFE ADDITION) ===
    avatar: {
      type: String,
    },
    bio: {
      type: String,
    },
    title: {
      type: String, // e.g. "Senior Developer"
    },
    location: {
      type: String, // e.g. "New York, USA"
    },
    points: {
      type: Number,
      default: 0,
    },

    engagement: {
      likes: {
        type: Number,
        default: 0,
      },
      comments: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
    },

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobPosting",
      },
    ],
    hasPaidInfluencer: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;