const express = require('express');
const blogController = require('../controllers/blogController');
const upload = require('../middlewares/cloudinary');
const userAuthentication = require("../middlewares/userAuthentication");

const blogRoutes = express.Router();

// ========================================
// ✅ CREATE BLOG - Protected with file uploads
// ========================================
// Create new blog (route: POST /blogs)
blogRoutes.post('/', userAuthentication, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'sectionImage_0', maxCount: 1 },
  { name: 'sectionImage_1', maxCount: 1 },
  { name: 'sectionImage_2', maxCount: 1 },
  { name: 'sectionImage_3', maxCount: 1 },
  { name: 'sectionImage_4', maxCount: 1 },
  { name: 'sectionImage_5', maxCount: 1 },
  { name: 'sectionImage_6', maxCount: 1 },
  { name: 'sectionImage_7', maxCount: 1 },
  { name: 'sectionImage_8', maxCount: 1 },
  { name: 'sectionImage_9', maxCount: 1 },
]), blogController.createBlog);

// ========================================
// ✅ STATIC ROUTES - MUST come before :slug
// These are specific paths that should not be confused with :slug
// ========================================

// Get stats
blogRoutes.get('/stats', blogController.getStats);

// Get latest blogs
blogRoutes.get('/latest', blogController.getLatestBlogs);

// Get all blogs (with filtering)
blogRoutes.get('/', blogController.getBlogs);

// ========================================
// ✅ DYNAMIC ROUTES - MUST come LAST
// :slug will match any path, so must be after static routes
// ========================================

// Get single blog by slug
blogRoutes.get('/:slug', blogController.getBlogBySlug);

// Update blog
blogRoutes.put('/:slug', userAuthentication, blogController.updateBlog);

// Delete blog
blogRoutes.delete('/:slug', userAuthentication, blogController.deleteBlog);

// ========================================
// ✅ LIKE/COMMENT ROUTES - Specific paths before :slug
// ========================================

// Like blog - Protected
blogRoutes.post('/:slug/like', userAuthentication, blogController.likeBlog);

// Get comments for blog - Public
blogRoutes.get('/:slug/comments', blogController.getComments);

// Add comment - Protected
blogRoutes.post('/:slug/comments', userAuthentication, blogController.addComment);

// Delete comment - Protected
blogRoutes.delete('/:slug/comments/:commentId', userAuthentication, blogController.deleteComment);

module.exports = blogRoutes;