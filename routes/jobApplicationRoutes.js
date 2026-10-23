const express = require('express');
const jobApplicationRoutes = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const cfUpload = require('../middlewares/cloudflare');

// USER ACTIONS
jobApplicationRoutes.post('/apply', cfUpload.single('resume', 'job-applications'), jobApplicationController.applyToJob);
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
