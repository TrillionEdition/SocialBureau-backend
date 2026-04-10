const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const atsController = require('../controllers/atsController');

const atsRoutes = express.Router();

/* =========================
   Rate Limiter
========================= */
const analyzeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: { message: "Too many requests, try again in an hour" },
    standardHeaders: true,
    legacyHeaders: false,
});

/* =========================
   Multer Setup
========================= */
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Analyze resume
atsRoutes.post(
    '/analyze',
    analyzeLimiter,
    upload.single('resume'),
    atsController.analyzeResume
);

// Generate fresh ATS-friendly resume
atsRoutes.post(
    '/generate-resume',
    analyzeLimiter,
    upload.single('resume'),
    atsController.generateResume
);

// Get ATS scan history
atsRoutes.get(
    '/history',
    atsController.getHistory
);

// Delete scan from history
atsRoutes.delete(
    '/history/:id',
    atsController.deleteHistory
);

// Get structured JSON resume for editing
atsRoutes.get(
    '/resume/:id',
    atsController.getResume
);

// Update structured JSON resume after user edits
atsRoutes.put(
    '/resume/:id',
    atsController.updateResume
);

module.exports = atsRoutes;
