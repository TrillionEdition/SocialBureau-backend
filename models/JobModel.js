const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },

    icon: String,
    department: String,
    company: String,
    createdAt: Date,
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    location: String,
    employment: String, // Full-Time | Internship

    description: String,
    about: String,

    roleSummary: [String],
    responsibilities: [String],
    qualifications: [String],
    experience: [String],

    salary: String,
    nextSteps: String,

    img: [String],
    link: String,
    applicationLink: String, // Google Form or external link

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
