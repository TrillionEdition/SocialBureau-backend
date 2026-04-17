const express = require('express');
const router = express.Router();
const apiLeadController = require('../controllers/apiLeadController');

router.post('/', apiLeadController.createLead);
router.get('/', apiLeadController.getAllLeads);
router.put('/:id', apiLeadController.updateLeadStatus);
router.delete('/:id', apiLeadController.deleteLead);

module.exports = router;
