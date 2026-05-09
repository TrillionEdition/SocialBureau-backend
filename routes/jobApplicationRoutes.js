const express = require('express');
const jobApplicationRoutes = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const multer = require('multer');

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('pdf')) {
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

module.exports = jobApplicationRoutes;
