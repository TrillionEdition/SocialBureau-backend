const express = require('express');
const jobApplicationRoutes = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const multer = require('multer');

// Multer Setup - Local Storage as requested
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'assets/job';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.includes('pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// USER ACTIONS
jobApplicationRoutes.post('/apply', upload.single('resume'), jobApplicationController.applyToJob);
jobApplicationRoutes.post('/save', jobApplicationController.saveJob);
jobApplicationRoutes.post('/unsave', jobApplicationController.unsaveJob);
jobApplicationRoutes.get('/user-applications/:userId', jobApplicationController.getUserApplications);
jobApplicationRoutes.get('/user-saved-jobs/:userId', jobApplicationController.getSavedJobs);

// EMPLOYER ACTIONS
jobApplicationRoutes.get('/application/:applicationId', jobApplicationController.getApplication);
jobApplicationRoutes.get('/job-applicants/:jobId', jobApplicationController.getApplicantsForJob);
jobApplicationRoutes.put('/update-status/:applicationId', jobApplicationController.updateStatus);
jobApplicationRoutes.post('/add-message/:applicationId', jobApplicationController.addMessage);
jobApplicationRoutes.post('/bulk-message', jobApplicationController.bulkMessage);
const isAdmin = require('../middlewares/isAdmin');
const authenticate = require('../middlewares/userAuthentication');

jobApplicationRoutes.get('/all-applications', authenticate, isAdmin, jobApplicationController.getAllApplications);
jobApplicationRoutes.get('/conversations/:userId', jobApplicationController.getUserConversations);
jobApplicationRoutes.delete('/:id', authenticate, isAdmin, jobApplicationController.deleteApplication);

module.exports = jobApplicationRoutes;
