const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    companyName: { type: String, required: true },
    companyWebsite: { type: String },
    employerFirstName: { type: String, required: true },
    employerLastName: { type: String, required: true },
    source: { type: String }, // How did they hear about us
    phoneNumber: { type: String },
    jobTitle: { type: String, required: true },
    locationType: { type: String, enum: ['In person', 'Hybrid', 'Remote'], default: 'In person' },
    location: { type: String, required: true },
    recruitmentTimeline: { type: String },
    hiringCount: { type: Number, default: 1 },
    jobTypes: [{ type: String }],
    payRange: {
        min: { type: Number },
        max: { type: Number },
        period: { type: String, default: 'per month' }
    },
    benefits: [{ type: String }],
    about: { type: String },
    roleSummary: [{ type: String }],
    responsibilities: [{ type: String }],
    description: { type: String, required: true },
    companyLogo: { type: String }, // Store URL or binary
    applicationLink: { type: String }, // For external redirects (Indeed, etc.)
    status: { type: String, enum: ['active', 'closed', 'paused'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobPosting', jobPostingSchema);
