const ClientReview = require('../models/clientReviewModel');
const { getCache, setCache, invalidateClientReviewCaches, CACHE_EXPIRY } = require("../utils/Cacheutils");

module.exports = {
  // Create a review
  createReview: async (req, res) => {
    try {
      const { rating, title, comment } = req.body;
      const userId = req.user.id;

      if (!rating || !title || !comment) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5',
        });
      }

      const review = await ClientReview.create({
        userId,
        rating,
        title,
        comment,
      });

      const populatedReview = await ClientReview.findById(review._id)
        .populate('userId', 'name email');

      // Invalidate cache
      await invalidateClientReviewCaches();

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: populatedReview,
      });
} catch (error) {
  res.status(500).json({
    success: false,
    message: error.message,
  });
}
  },

// Get all reviews
getAllReviews: async (req, res) => {
  try {
    const cacheKey = "client:reviews:all";
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData,
      });
    }

    const reviews = await ClientReview.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    await setCache(cacheKey, reviews, CACHE_EXPIRY.BLOGS_LIST);

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
},

  // Update a review
  updateReview: async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, title, comment } = req.body;
      const userId = req.user.id;

      const review = await ClientReview.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      // Check ownership
      if (review.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own review',
        });
      }

      const updatedReview = await ClientReview.findByIdAndUpdate(
        id,
        { rating, title, comment },
        { new: true, runValidators: true }
      ).populate('userId', 'name email');

      // Invalidate cache
      await invalidateClientReviewCaches();

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

    // Delete a review
    deleteReview: async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.id;

        const review = await ClientReview.findById(id);

        if (!review) {
          return res.status(404).json({
            success: false,
            message: 'Review not found',
          });
        }

        // Check ownership
        if (review.userId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete your own review',
          });
        }

        await ClientReview.findByIdAndDelete(id);

        // Invalidate cache
        await invalidateClientReviewCaches();

        res.status(200).json({
          success: true,
          message: 'Review deleted successfully',
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }
};