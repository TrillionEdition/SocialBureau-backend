const express = require('express');
const eventController = require('../controllers/eventController');
const upload = require('../middlewares/cloudinary');
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const eventRoutes = express.Router();

// Create new event
// Create new event (supports file upload: field name 'image')
eventRoutes.post('/add', userAuthentication, isAdmin, upload.single('image'), eventController.createEvent);

// Get all events (with filters)
eventRoutes.get('/list', eventController.getEvents);

// Get upcoming events
eventRoutes.get('/upcoming', eventController.getUpcomingEvents);

// Get single event by ID
eventRoutes.get('/:id', eventController.getEventById);

// Update event
eventRoutes.patch('/:id', userAuthentication, isAdmin, eventController.updateEvent);

// Delete event
eventRoutes.delete('/:id', userAuthentication, isAdmin, eventController.deleteEvent);

// Generate calendar file for event
eventRoutes.get('/:id/calendar', eventController.generateCalendarFile);

// Register for event
eventRoutes.post('/:id/register', eventController.registerForEvent);

module.exports = eventRoutes;
