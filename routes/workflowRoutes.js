const express = require('express');
const router = express.Router();
const { submitWorkflow, getAllWorkflows } = require('../controllers/workflowController');

// Accept workflow submissions
router.post('/', submitWorkflow);

// Get all workflow submissions
router.get('/', getAllWorkflows);

module.exports = router;
