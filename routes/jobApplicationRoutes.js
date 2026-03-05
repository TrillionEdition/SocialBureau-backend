const express = require('express');
const router = express.Router();
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
router.post('/apply', upload.single('resume'), jobApplicationController.applyToJob);
router.post('/save', jobApplicationController.saveJob);
router.get('/user-applications/:userId', jobApplicationController.getUserApplications);
router.get('/user-saved-jobs/:userId', jobApplicationController.getSavedJobs);

// EMPLOYER ACTIONS
router.get('/application/:applicationId', jobApplicationController.getApplication);
router.get('/job-applicants/:jobId', jobApplicationController.getApplicantsForJob);
router.put('/update-status/:applicationId', jobApplicationController.updateStatus);

module.exports = router;
