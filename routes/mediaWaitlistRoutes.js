const express = require('express');
const router = express.Router();
const mediaWaitlistController = require('../controllers/mediaWaitlistController');

router.post('/join', mediaWaitlistController.createEntry);
router.get('/', mediaWaitlistController.getAllEntries);
router.patch('/:id/status', mediaWaitlistController.updateStatus);
router.delete('/:id', mediaWaitlistController.deleteEntry);

module.exports = router;
