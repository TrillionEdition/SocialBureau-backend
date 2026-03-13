const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'jobModel',
        required: true
    },
    jobModel: {
        type: String,
        required: true,
        enum: ['JobPosting', 'ExternalJob'],
        default: 'JobPosting'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    candidatePhone: { type: String },
    resumeUrl: { type: String },
    coverLetter: { type: String },
    status: {
        type: String,
        enum: ['pending', 'shortlisted', 'rejected', 'selected', 'interested'],
        default: 'pending'
    },
    messages: [
        {
            senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            senderRole: { type: String, enum: ['employer', 'candidate'] },
            content: { type: String },
            timestamp: { type: Date, default: Date.now }
        }
    ],
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
