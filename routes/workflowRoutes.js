const express = require('express');
const router = express.Router();
const { submitWorkflow, getAllWorkflows } = require('../controllers/workflowController');
const userAuthentication = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');

// Accept workflow submissions
router.post('/', submitWorkflow);

// Get all workflow submissions
router.get('/', userAuthentication, isAdmin, getAllWorkflows);

module.exports = router;
