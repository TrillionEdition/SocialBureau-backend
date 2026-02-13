const express = require('express');
const clientReviewRoutes = express.Router();
const {
  createReview,
  getAllReviews,
  updateReview,
  deleteReview,
} = require('../controllers/clientreviewController');

const userAuthentication = require('../middlewares/userAuthentication');

clientReviewRoutes.post('/', userAuthentication, createReview);
clientReviewRoutes.get('/', getAllReviews);
clientReviewRoutes.put('/:id', userAuthentication, updateReview);
clientReviewRoutes.delete('/:id', userAuthentication, deleteReview);

module.exports = clientReviewRoutes;
