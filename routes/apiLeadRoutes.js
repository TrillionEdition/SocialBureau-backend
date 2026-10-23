const express = require('express');
const router = express.Router();
const apiLeadController = require('../controllers/apiLeadController');
const userAuthentication = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');

router.post('/', apiLeadController.createLead);
router.get('/', userAuthentication, isAdmin, apiLeadController.getAllLeads);
router.put('/:id', userAuthentication, isAdmin, apiLeadController.updateLeadStatus);
router.delete('/:id', userAuthentication, isAdmin, apiLeadController.deleteLead);

module.exports = router;
