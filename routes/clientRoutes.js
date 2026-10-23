// routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.post('/intake', clientController.createClient);
router.get('/:id', clientController.getClient);
router.get('/', clientController.getAllClients);
router.patch('/:id', clientController.updateClient);
router.post('/:id/follow-up', clientController.addInteraction);

module.exports = router;