const express = require('express');
const jobApplicationRoutes = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const cfUpload = require('../middlewares/cloudflare');
const authenticate = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');
const optionalAuth = (req, res, next) => {
    if (!req.cookies?.token && !req.headers.authorization) return next();
    return authenticate(req, res, next);
};

// USER ACTIONS
jobApplicationRoutes.post('/apply', optionalAuth, cfUpload.single('resume', 'job-applications'), jobApplicationController.applyToJob);
jobApplicationRoutes.post('/save', authenticate, jobApplicationController.saveJob);
jobApplicationRoutes.post('/unsave', authenticate, jobApplicationController.unsaveJob);
jobApplicationRoutes.get('/user-applications/:userId', authenticate, jobApplicationController.getUserApplications);
jobApplicationRoutes.get('/user-saved-jobs/:userId', authenticate, jobApplicationController.getSavedJobs);

// EMPLOYER ACTIONS
jobApplicationRoutes.get('/application/:applicationId', authenticate, isAdmin, jobApplicationController.getApplication);
jobApplicationRoutes.get('/job-applicants/:jobId', authenticate, isAdmin, jobApplicationController.getApplicantsForJob);
jobApplicationRoutes.put('/update-status/:applicationId', authenticate, isAdmin, jobApplicationController.updateStatus);
jobApplicationRoutes.post('/add-message/:applicationId', authenticate, isAdmin, jobApplicationController.addMessage);
jobApplicationRoutes.post('/bulk-message', authenticate, isAdmin, jobApplicationController.bulkMessage);

jobApplicationRoutes.get('/all-applications', authenticate, isAdmin, jobApplicationController.getAllApplications);
jobApplicationRoutes.get('/conversations/:userId', authenticate, jobApplicationController.getUserConversations);
jobApplicationRoutes.delete('/:id', authenticate, isAdmin, jobApplicationController.deleteApplication);

module.exports = jobApplicationRoutes;
