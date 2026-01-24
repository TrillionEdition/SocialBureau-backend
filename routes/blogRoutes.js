// const express = require('express');
// const router = express.Router();
// const blogController = require('../controllers/blogController');
// const upload = require('../middlewares/cloudinary');
// const blogRoutes = express.Router();

// // Create new blog (with multiple image uploads - main image + section images)
// blogRoutes.post('/blogs', upload.fields([
//   { name: 'image', maxCount: 1 },
//   { name: 'sectionImage_0', maxCount: 1 },
//   { name: 'sectionImage_1', maxCount: 1 },
//   { name: 'sectionImage_2', maxCount: 1 },
//   { name: 'sectionImage_3', maxCount: 1 },
//   { name: 'sectionImage_4', maxCount: 1 },
//   { name: 'sectionImage_5', maxCount: 1 },
//   { name: 'sectionImage_6', maxCount: 1 },
//   { name: 'sectionImage_7', maxCount: 1 },
//   { name: 'sectionImage_8', maxCount: 1 },
//   { name: 'sectionImage_9', maxCount: 1 },
// ]), blogController.createBlog);

// // Get latest blogs (MUST be before /:slug route)
// blogRoutes.get('/blogs/latest', blogController.getLatestBlogs);

// // List all blogs
// blogRoutes.get('/blogs', blogController.listBlogs);

// // Get stats
// blogRoutes.get('/stats', blogController.getStats);

// // Get single blog by slug (MUST be after /latest route)
// blogRoutes.get('/blogs/:slug', blogController.getBlogBySlug);

// // Update blog
// blogRoutes.patch('/blogs/:slug', blogController.updateBlog);

// // Delete blog
// blogRoutes.delete('/blogs/:slug', blogController.deleteBlog);

// blogRoutes.post('/:slug/like', blogController.likeBlog);
         
// // NEW: Comments endpoints
// blogRoutes.get('/:slug/comments', blogController.getComments);
// blogRoutes.post('/:slug/comments', blogController.addComment);
// blogRoutes.delete('/:slug/comments/:commentId', blogController.deleteComment);

// module.exports = blogRoutes; 



const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const upload = require('../middlewares/cloudinary');
const userAuthentication = require("../middlewares/userAuthentication");
const blogRoutes = express.Router();

// Create new blog (with multiple image uploads - main image + section images)
blogRoutes.post('/blogs', userAuthentication, upload.fields([
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

// ✅ IMPORTANT: Static routes MUST come before dynamic :slug route
// Get latest blogs
blogRoutes.get('/blogs/latest', blogController.getLatestBlogs);

// Get stats
blogRoutes.get('/blogs/stats', blogController.getStats);

// List all blogs
blogRoutes.get('/blogs', blogController.listBlogs);

// ✅ DYNAMIC ROUTES - These come LAST
// Get single blog by slug
blogRoutes.get('/blogs/:slug', blogController.getBlogBySlug);

// Update blog
blogRoutes.patch('/blogs/:slug', blogController.updateBlog);

// Delete blog
blogRoutes.delete('/blogs/:slug', blogController.deleteBlog);

// ✅ LIKE BLOG - Protected (specific route before :slug)
blogRoutes.post('/blogs/:slug/like', userAuthentication, blogController.likeBlog);

// ✅ ADD COMMENT - Protected (specific route before :slug)
blogRoutes.post('/blogs/:slug/comments', userAuthentication, blogController.addComment);

// ✅ DELETE COMMENT - Protected (specific route before :slug)
blogRoutes.delete('/blogs/:slug/comments/:commentId', userAuthentication, blogController.deleteComment);

// ✅ GET COMMENTS - Public (specific route before :slug)
blogRoutes.get('/blogs/:slug/comments', blogController.getComments);

module.exports = blogRoutes;