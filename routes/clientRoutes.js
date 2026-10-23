// routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const userAuthentication = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');

router.post('/intake', clientController.createClient);
router.get('/:id', userAuthentication, isAdmin, clientController.getClient);
router.get('/', userAuthentication, isAdmin, clientController.getAllClients);
router.patch('/:id', userAuthentication, isAdmin, clientController.updateClient);
router.post('/:id/follow-up', userAuthentication, isAdmin, clientController.addInteraction);

module.exports = router;