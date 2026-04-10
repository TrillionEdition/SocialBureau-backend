const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    personalInfo: {
        name: { type: String, default: '' },
        title: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        location: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' }
    },
    summary: { type: String, default: '' },
    skills: [{ type: String }],
    softSkills: [{ type: String }],
    experience: [{
        jobTitle: { type: String, default: '' },
        company: { type: String, default: '' },
        location: { type: String, default: '' },
        startDate: { type: String, default: '' },
        endDate: { type: String, default: '' },
        duration: { type: String, default: '' },
        description: [{ type: String }]
    }],
    projects: [{
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        technologies: [{ type: String }],
        github: { type: String, default: '' },
        liveLink: { type: String, default: '' }
    }],
    education: [{
        degree: { type: String, default: '' },
        institution: { type: String, default: '' },
        location: { type: String, default: '' },
        startYear: { type: String, default: '' },
        endYear: { type: String, default: '' }
    }],
    certifications: [{ type: String }],
    languages: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
