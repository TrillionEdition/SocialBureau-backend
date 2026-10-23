const express = require('express');
const jobPostingRoutes = express.Router();
const jobPostingController = require('../controllers/jobPostingController');
const userAuthentication = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');

jobPostingRoutes.post('/', userAuthentication, isAdmin, jobPostingController.createJobPosting);
jobPostingRoutes.get('/', jobPostingController.getJobPostings);
jobPostingRoutes.get('/employer-jobs/:employerId', userAuthentication, isAdmin, jobPostingController.getEmployerJobs);
jobPostingRoutes.get('/:id', jobPostingController.getJobDetails);

module.exports = jobPostingRoutes;
