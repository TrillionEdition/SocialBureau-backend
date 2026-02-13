const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
const expressAsyncHandler = require("express-async-handler");
const { default: axios } = require("axios");
const User = require('../models/userModel');

function sendError(res, status = 400, message = 'Bad Request', details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

const reviewController = {
  
createReview:expressAsyncHandler(async (req, res) => {
  try {
    const { name, email, review, rating, employee: employeeId } = req.body;

    // Basic validation
    if (!email) return sendError(res, 400, 'email is required');
    if (!review) return sendError(res, 400, 'review text is required');
    if (rating === undefined || rating === null) return sendError(res, 400, 'rating is required');

    const ratingInt = Number(rating);
    if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return sendError(res, 400, 'rating must be an integer between 1 and 5');
    }

    // Duplicate prevention
    const dupFilter = {};
      dupFilter.email = email.toLowerCase();
      dupFilter.employee = employeeId;

    if (Object.keys(dupFilter).length > 0) {
      const existing = await Review.findOne(dupFilter).lean();
      if (existing) {
        return sendError(res, 409, 'A review from this author for this employee already exists');
      }
    }

    const newReview = new Review({
  name,
  email,
  review,
  rating: ratingInt,
  employee: employeeId,
  approved: false, // default; moderation flow
});
const saved = await newReview.save();

const user = await User.findById(employeeId);
if (!user) {
  // handle missing user appropriately (example: return or throw)
  return sendError(res, 404, 'Employee not found');
}

// ensure reviews array exists, then push the review id
user.reviews = user.reviews || [];
user.reviews.push(newReview._id);

// persist the change
await user.save();
    

    // Optionally populate user/employee
    const populated = await Review.findById(saved._id)
      .populate(employeeId ? 'employee' : '')
      .lean();

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('createReview error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

/**
 * Get a single review by id
 */
getReviewById : expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, 'invalid review id');

    const review = await Review.findById(id).populate('employee', 'name email').lean();
    if (!review) return sendError(res, 404, 'Review not found');

    return res.json({ success: true, data: review });
  } catch (err) {
    console.error('getReviewById error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

listReviews:expressAsyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      approved,
      employee,
      minRating,
      maxRating,
      q,
      fields,
    } = req.query;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};

    if (approved !== undefined) {
      if (approved === 'true' || approved === '1') filter.approved = true;
      else if (approved === 'false' || approved === '0') filter.approved = false;
    }

    if (employee) {
      if (!mongoose.Types.ObjectId.isValid(employee)) return sendError(res, 400, 'invalid employee id');
      filter.employee = employee;
    }

    if (minRating !== undefined) filter.rating = { ...(filter.rating || {}), $gte: Number(minRating) };
    if (maxRating !== undefined) filter.rating = { ...(filter.rating || {}), $lte: Number(maxRating) };

    if (q) {
      // basic text search on review, name, email
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ review: regex }, { name: regex }, { email: regex }];
    }

    const skip = (p - 1) * l;

    let query = Review.find(filter)
      .skip(skip)
      .limit(l)
      .sort(sort)
      .populate('employee', 'name email');

    if (fields) {
      // fields comma separated
      const select = fields.split(',').join(' ');
      query = query.select(select);
    }

    const [items, total] = await Promise.all([query.lean(), Review.countDocuments(filter)]);

    return res.json({
      success: true,
      meta: {
        page: p,
        limit: l,
        total,
        pages: Math.ceil(total / l),
      },
      data: items,
    });
  } catch (err) {
    console.error('listReviews error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

updateReview:expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, 'invalid review id');

    const allowed = ['name', 'email', 'review', 'rating', 'approved'];
    const updates = {};
    allowed.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) updates[k] = req.body[k];
    });

    if (updates.rating !== undefined) {
      const r = Number(updates.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) return sendError(res, 400, 'rating must be an integer between 1 and 5');
      updates.rating = r;
    }

    const updated = await Review.findByIdAndUpdate(id, updates, { new: true }).populate('employee', 'name email').lean();
    if (!updated) return sendError(res, 404, 'Review not found');

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateReview error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

deleteReview:expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, 'invalid review id');

    const removed = await Review.findByIdAndDelete(id).lean();
    if (!removed) return sendError(res, 404, 'Review not found');

    return res.json({ success: true, data: removed });
  } catch (err) {
    console.error('deleteReview error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

approveReview:expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, 'invalid review id');

    const updated = await Review.findByIdAndUpdate(id, { approved: true }, { new: true }).lean();
    if (!updated) return sendError(res, 404, 'Review not found');

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('approveReview error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

getEmployeeRatingSummary:expressAsyncHandler(async (req, res) => {
  try {
    const { employee } = req.body;
    if (!mongoose.Types.ObjectId.isValid(employee)) return sendError(res, 400, 'invalid employee id');

    const pipeline = [
      { $match: { employee: new mongoose.Types.ObjectId(employee), approved: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ];

    const groups = await Review.find(employee);

    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let total = 0;
    let weightedSum = 0;
    groups.forEach((g) => {
      const rating = Number(g._id) || 0;
      const key = String(rating);
      if (distribution.hasOwnProperty(key)) distribution[key] = g.count;
      if (rating >= 1 && rating <= 5) {
        total += g.count;
        weightedSum += rating * g.count;
      }
    });

    const averageRating = total > 0 ? Number((weightedSum / total).toFixed(2)) : 0;

    return res.json({
      success: true,
      data: {
        employee,
        totalReviews: total,
        averageRating,
        distribution,
      },
    });
  } catch (err) {
    console.error('getEmployeeRatingSummary error', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
})

,
/*
 * Fetch Google Place Details (reviews) and return reviews array.
 * Query params: placeId (optional - falls back to env GOOGLE_PLACE_ID)
 */
getGoogleReviews: expressAsyncHandler(async (req, res) => {
  try {
    const placeId = req.query.placeId || process.env.GOOGLE_PLACE_ID;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) return sendError(res, 500, 'Google API key not configured on server');
    if (!placeId) return sendError(res, 400, 'placeId is required (query param or GOOGLE_PLACE_ID env)');

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,rating,reviews,formatted_phone_number,website`;

    const resp = await axios.get(url, { params: { key: apiKey } });
    const data = resp.data;
    if (!data) return sendError(res, 502, 'No response from Google Places API');
    if (data.status && data.status !== 'OK') {
      const message = data.error_message || data.status;
      return sendError(res, 502, `Google Places API error: ${message}`);
    }

    // return the reviews (if any) and some place metadata
    // Google Place Details returns review objects which often include
    // `profile_photo_url` for the reviewer. Normalize reviews and
    // provide a safe fallback for the frontend.
    const normalizedReviews = (data.result?.reviews || []).map((r) => ({
      author_name: r.author_name,
      author_url: r.author_url,
      profile_photo_url: r.profile_photo_url || null, // may be absent for some reviews
      rating: r.rating,
      relative_time_description: r.relative_time_description,
      text: r.text,
      time: r.time,
    }));

    const result = {
      place: {
        name: data.result?.name,
        rating: data.result?.rating,
        phone: data.result?.formatted_phone_number,
        website: data.result?.website,
      },
      reviews: normalizedReviews,
    };
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('getGoogleReviews error', err?.response?.data || err.message || err);
    return sendError(res, 500, 'Failed to fetch Google reviews', err.message || err);
  }
})
}

module.exports=reviewController