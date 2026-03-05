const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    resumeUrl: { type: String },
    coverLetter: { type: String },
    status: {
        type: String,
        enum: ['pending', 'shortlisted', 'rejected', 'selected'],
        default: 'pending'
    },
    employerMessage: { type: String }, // For messages like "You are selected for interview"
    relocationInterest: { type: Boolean, default: false },
    atsResult: {
        score: Number,
        matchedKeywords: [String],
        missingKeywords: [String],
        skillGaps: [String],
        matchedSkills: [String],
        hasPortfolio: Boolean,
        experienceYears: Number,
        projectCount: Number,
        softSkillsMatch: [String],
        softSkillsMissing: [String]
    },
    appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
