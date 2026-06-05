const express = require('express');
const router = express.Router();
const { submitWorkflow } = require('../controllers/workflowController');

// Accept workflow submissions
router.post('/', submitWorkflow);

module.exports = router;
