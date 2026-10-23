const express = require("express");
const reviewController = require("../controllers/reviewController");
const reviewRoutes = express.Router();
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

reviewRoutes.post('/add', reviewController.createReview);
reviewRoutes.get('/view', reviewController.listReviews);
// Proxy for Google Place Details (reviews)
reviewRoutes.get('/google', reviewController.getGoogleReviews);
reviewRoutes.get('/reviews/:id', reviewController.getReviewById);
reviewRoutes.patch('/reviews/:id', userAuthentication, isAdmin, reviewController.updateReview);
reviewRoutes.delete('/reviews/:id', userAuthentication, isAdmin, reviewController.deleteReview);
reviewRoutes.post('/approve/:id', userAuthentication, isAdmin, reviewController.approveReview);
reviewRoutes.get('/ratings', reviewController.getEmployeeRatingSummary);

module.exports = reviewRoutes;
