const express = require('express');
const qaController = require('../controllers/qaController');
const qaRoutes = express.Router();

// Create new question
qaRoutes.post('/questions', qaController.createQuestion);

// List all questions
qaRoutes.get('/questions', qaController.listQuestions);

// Get stats
qaRoutes.get('/stats', qaController.getStats);

// Get single question
qaRoutes.get('/questions/:id', qaController.getQuestionById);

// Upvote question
qaRoutes.post('/questions/:id/upvote', qaController.upvoteQuestion);

// Mark as answered
qaRoutes.post('/questions/:id/answer', qaController.markAnswered);

// Update question
qaRoutes.patch('/questions/:id', qaController.updateQuestion);

// Delete question
qaRoutes.delete('/questions/:id', qaController.deleteQuestion);

module.exports = qaRoutes;
