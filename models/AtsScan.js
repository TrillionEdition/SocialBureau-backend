const mongoose = require('mongoose');

const AtsScanSchema = new mongoose.Schema({
    clientId: {
        type: String,
        required: true,
        index: true
    },
    fileName: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    result: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AtsScan = mongoose.model('AtsScan', AtsScanSchema);

module.exports = AtsScan;
