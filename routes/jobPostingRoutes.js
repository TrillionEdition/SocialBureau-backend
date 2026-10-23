const express = require('express');
const jobPostingRoutes = express.Router();
const jobPostingController = require('../controllers/jobPostingController');

jobPostingRoutes.post('/', jobPostingController.createJobPosting);
jobPostingRoutes.get('/', jobPostingController.getJobPostings);
jobPostingRoutes.get('/employer-jobs/:employerId', jobPostingController.getEmployerJobs);
jobPostingRoutes.get('/:id', jobPostingController.getJobDetails);

module.exports = jobPostingRoutes;
