const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const cfUpload = require('../middlewares/cloudflare');
const ResumeDraft = require('../models/resumeModel');
const resumeController = require('../controllers/resumeController');

const resumeRoutes = express.Router();

/* =========================
   Rate Limiters
========================= */
const extractLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: { message: "Too many extraction requests, try again in an hour" },
    standardHeaders: true,
    legacyHeaders: false,
});

const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: { message: "Too many generation requests, try again in an hour" },
    standardHeaders: true,
    legacyHeaders: false,
});

/* =========================
   Multer Setup
========================= */
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for resume PDFs
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

/* =========================
   Routes
========================= */

// Extract data from PDF resume
resumeRoutes.post(
    '/extract-pdf',
    extractLimiter,
    upload.single('file'),
    resumeController.extractPdfData
);

// Generate resume
resumeRoutes.post(
    '/generate',
    generateLimiter,
    resumeController.generateResume
);

// Download resume as PDF
resumeRoutes.post(
    '/download-pdf',
    generateLimiter,
    resumeController.downloadResumePDF
);

// Save resume draft
resumeRoutes.post(
    '/save-draft',
    generateLimiter,
    cfUpload.single('file', 'resumes'),
    resumeController.saveDraft
);

// Get saved drafts for user
resumeRoutes.get(
    '/drafts/:userId',
    resumeController.getDrafts
);

// Delete resume draft
resumeRoutes.delete(
    '/draft/:draftId',
    resumeController.deleteDraft
);

const userAuthentication = require('../middlewares/userAuthentication');
const adminAuthentication = require('../middlewares/adminAuthentication');

// Admin: Get all resumes
resumeRoutes.get(
    '/admin/resumes',
    userAuthentication,
    adminAuthentication,
    resumeController.getAdminResumes
);

// Analyze resume against job description
resumeRoutes.post(
    '/analyze-match',
    generateLimiter,
    resumeController.analyzeResumeMatch
);

// Generate resume improvement suggestions
resumeRoutes.post(
    '/improvements',
    generateLimiter,
    resumeController.generateImprovements
);

// Calculate resume score
resumeRoutes.post(
    '/score',
    generateLimiter,
    resumeController.calculateResumeScore
);

// AI: Get improvement suggestions
resumeRoutes.post(
    '/ai-improvements',
    generateLimiter,
    resumeController.getAIImprovements
);

// AI: Generate enhanced summary
resumeRoutes.post(
    '/generate-summary',
    generateLimiter,
    resumeController.generateAISummary
);

// AI: Improve specific section
resumeRoutes.post(
    '/improve-section',
    generateLimiter,
    resumeController.improveSection
);

// AI: Get personalized tips
resumeRoutes.post(
    '/get-tips',
    generateLimiter,
    resumeController.getResumeTips
);

// AI: Check resume quality
resumeRoutes.post(
    '/quality-check',
    generateLimiter,
    resumeController.checkQuality
);

// AI: Rewrite content
resumeRoutes.post(
    '/rewrite',
    generateLimiter,
    resumeController.rewriteContent
);

// AI: Generate resume from job description
resumeRoutes.post(
    '/generate-from-job',
    generateLimiter,
    resumeController.generateResumeFromJob
);

// AI: Generate section suggestions
resumeRoutes.post(
    '/section-suggestions',
    generateLimiter,
    resumeController.generateSectionSuggestions
);

// AI: Optimize resume for job
resumeRoutes.post(
    '/optimize-for-job',
    generateLimiter,
    resumeController.optimizeResumeForJob
);

// AI: Generate experience description
resumeRoutes.post(
    '/generate-experience',
    generateLimiter,
    resumeController.generateExperienceDescription
);

// AI: Recommend skills
resumeRoutes.post(
    '/recommend-skills',
    generateLimiter,
    resumeController.recommendSkills
);

// SEO: Extract keywords from job description
resumeRoutes.post(
    '/extract-seo-keywords',
    generateLimiter,
    resumeController.extractSEOKeywords
);

// SEO: Analyze keyword match between resume and job
resumeRoutes.post(
    '/analyze-seo-match',
    generateLimiter,
    resumeController.analyzeSEOMatch
);

// AI: Generate multiple suggestions for a section
resumeRoutes.post(
    '/generate-suggestions',
    generateLimiter,
    resumeController.generateSuggestions
);

module.exports = resumeRoutes;
