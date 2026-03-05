const express = require('express');
const router = express.Router();
const jobPostingController = require('../controllers/jobPostingController');

router.post('/', jobPostingController.createJobPosting);
router.get('/', jobPostingController.getJobPostings);
router.get('/:id', jobPostingController.getJobDetails);

module.exports = router;
