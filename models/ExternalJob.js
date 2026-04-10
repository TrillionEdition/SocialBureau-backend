const mongoose = require('mongoose');

const externalJobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    jobType: { type: String, default: 'Full-time' },
    salary: { type: String },
    description: { type: String },
    externalLink: { type: String, required: true }, // e.g., Indeed, LinkedIn URL
    source: { type: String, default: 'External' }, // Indeed, LinkedIn, etc.
    companyLogo: { type: String },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    postedAt: { type: Date, default: Date.now },
    addedBy: { type: String } // admin who added it
});

module.exports = mongoose.model('ExternalJob', externalJobSchema);
