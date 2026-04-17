const mongoose = require('mongoose');

const mediaWaitlistSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    source: {
        type: String,
        default: 'Home Page Waiting List'
    },
    status: {
        type: String,
        enum: ['Pending', 'Contacted', 'Ignored'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MediaWaitlist', mediaWaitlistSchema);
