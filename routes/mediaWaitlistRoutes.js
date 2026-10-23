const express = require('express');
const router = express.Router();
const mediaWaitlistController = require('../controllers/mediaWaitlistController');
const userAuthentication = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');

router.post('/join', mediaWaitlistController.createEntry);
router.get('/', userAuthentication, isAdmin, mediaWaitlistController.getAllEntries);
router.patch('/:id/status', userAuthentication, isAdmin, mediaWaitlistController.updateStatus);
router.delete('/:id', userAuthentication, isAdmin, mediaWaitlistController.deleteEntry);

module.exports = router;
