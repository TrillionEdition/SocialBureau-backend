const mongoose = require('mongoose');
const Blog = require('../models/blogModel');
const expressAsyncHandler = require('express-async-handler');
const {
  addComment,
  removeComment,
} = require('../services/engagementService');

function sendError(res, status = 400, message = 'Bad Request', details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

const blogController = {
  // Create a new blog post
  createBlog: expressAsyncHandler(async (req, res) => {
    try {
      const { title, excerpt, content, category, author, slug, customUrl, keywords, childBlogs, seoTitle, seoDescription } = req.body;

      // Get user ID from authenticated request
      const userId = req.user?._id || req.user?.id;

      if (!title) return sendError(res, 400, 'Title is required');

      // Parse content if it comes as string
      let contentArray = content;
      if (typeof content === 'string') {
        try {
          contentArray = JSON.parse(content);
        } catch (e) {
          return sendError(res, 400, 'Content must be a valid array or JSON string');
        }
      }

      if (!contentArray || !Array.isArray(contentArray)) {
        return sendError(res, 400, 'Content is required and must be an array');
      }

      // Process uploaded section images
      const files = req.files || {};
      contentArray = contentArray.map((section, index) => {
        const sectionImageKey = `sectionImage_${index}`;
        if (files[sectionImageKey] && files[sectionImageKey][0]) {
          section.image = files[sectionImageKey][0].path; // Cloudinary URL
        }
        return section;
      });

      // Validate word count (max 2000 words)
      let totalWords = 0;
      contentArray.forEach(section => {
        if (section.text) {
          // Strip HTML tags and count words
          const plainText = section.text.replace(/<[^>]*>/g, '');
          totalWords += plainText.trim().split(/\s+/).length;
        }
      });

      if (totalWords > 2000) {
        return sendError(res, 400, `Content exceeds maximum word limit. Current: ${totalWords} words, Maximum: 2000 words`);
      }

      // Get main blog image URL from uploaded file
      let imageUrl = null;
      if (files.image && files.image[0]) {
        imageUrl = files.image[0].path; // Cloudinary URL
      } else if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl; // Fallback to URL if provided
      }

      if (!imageUrl) {
        return sendError(res, 400, 'Image is required');
      }

      // Generate slug if not provided
      let blogSlug = slug;
      if (!blogSlug) {
        blogSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      // Check if slug already exists
      const existingBlog = await Blog.findOne({ slug: blogSlug });
      if (existingBlog) {
        blogSlug = `${blogSlug}-${Date.now()}`;
      }

      // Parse keywords if string
      let keywordsArray = keywords;
      if (typeof keywords === 'string') {
        try {
          keywordsArray = JSON.parse(keywords);
        } catch (e) {
          keywordsArray = keywords.split(',').map(k => k.trim());
        }
      }

      // Parse childBlogs if string
      let childBlogsArray = childBlogs;
      if (typeof childBlogs === 'string') {
        try {
          childBlogsArray = JSON.parse(childBlogs);
        } catch (e) {
          childBlogsArray = [];
        }
      }

      const newBlog = new Blog({
        title,
        slug: blogSlug,
        customUrl: customUrl || null,
        excerpt: excerpt || '',
        content: contentArray,
        image: imageUrl,
        category: category || 'general',
        authorName: author || 'SocialBureau Team',
        user: userId, // Link blog to the creator
        keywords: keywordsArray || [],
        childBlogs: childBlogsArray || [],
        published: true,
        publishedAt: new Date(),
        seo: {
          title: seoTitle || title,
          description: seoDescription || excerpt || '',
        },
      });

      const saved = await newBlog.save();
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      console.error('createBlog error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // List blogs
  getBlogs: expressAsyncHandler(async (req, res) => {
    try {
      const { category, limit = 10, published = 'true' } = req.query;
      console.log('📚 getBlogs called with params:', { category, limit, published });

      // Convert published string to boolean
      const isPublished = published === 'true' || published === true;

      let query = { published: isPublished };
      if (category && category !== 'All Posts') {
        query.category = category;
      }

      console.log('🔍 Querying blogs with:', query);
      const blogs = await Blog.find(query)
        .sort('-createdAt')
        .limit(parseInt(limit))
        .lean();

      console.log(`✅ Found ${blogs.length} blogs`);
      return res.json({ success: true, data: blogs });
    } catch (err) {
      console.error('❌ getBlogs error:', err);
      console.error('Error stack:', err.stack);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get single blog by slug
  getBlogBySlug: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;
      console.log('📖 getBlogBySlug called for slug:', slug);

      // Increment view count safely (skip if DB not ready)
      try {
        if (mongoose.connection.readyState === 1) { // 1 = connected
          // don't await so that even if it fails we still return the blog quickly
          Blog.findOneAndUpdate({ slug }, { $inc: { 'meta.views': 1 } }).catch(err => console.warn('view increment failed:', err.message));
        } else {
          console.warn('Skipping view increment - mongoose not connected (readyState=' + mongoose.connection.readyState + ')');
        }
      } catch (err) {
        console.warn('view increment error:', err && err.message ? err.message : err);
      }

      console.log('🔍 Querying blog with slug:', slug);
      const blog = await Blog.findOne({ slug })
        .populate('childBlogs', 'title slug excerpt image category')
        .lean();

      if (!blog) {
        console.log('❌ Blog not found for slug:', slug);
        return sendError(res, 404, 'Blog not found');
      }

      console.log('✅ Blog found:', blog.title);
      return res.json({ success: true, data: blog });
    } catch (err) {
      console.error('❌ getBlogBySlug error:', err);
      console.error('Error stack:', err.stack);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get latest blogs
  getLatestBlogs: expressAsyncHandler(async (req, res) => {
    try {
      const { limit = 3 } = req.query;
      const l = Math.min(10, Math.max(1, parseInt(limit, 10) || 3));

      const blogs = await Blog.find({ published: true })
        .sort('-createdAt')
        .limit(l)
        .lean();
      return res.json({ success: true, data: blogs });
    } catch (err) {
      console.error('getLatestBlogs error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Update blog
  updateBlog: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;

      const allowed = ['title', 'excerpt', 'content', 'image', 'category', 'authorName', 'published', 'customUrl', 'keywords', 'childBlogs', 'seo'];
      const updates = {};
      allowed.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(req.body, k))
          updates[k] = req.body[k];
      });

      // Update publishedAt if published is set to true
      if (updates.published === true) {
        updates.publishedAt = new Date();
      }

      // Validate word count if content is being updated
      if (updates.content) {
        let totalWords = 0;
        updates.content.forEach(section => {
          if (section.text) {
            const plainText = section.text.replace(/<[^>]*>/g, '');
            totalWords += plainText.trim().split(/\s+/).length;
          }
        });

        if (totalWords > 2000) {
          return sendError(res, 400, `Content exceeds maximum word limit. Current: ${totalWords} words, Maximum: 2000 words`);
        }
      }

      // Update slug if title changed
      if (updates.title) {
        updates.slug = updates.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      const updated = await Blog.findOneAndUpdate({ slug }, updates, {
        new: true,
      }).lean();
      if (!updated) return sendError(res, 404, 'Blog not found');

      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('updateBlog error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Delete blog
  deleteBlog: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;

      const removed = await Blog.findOneAndDelete({ slug }).lean();
      if (!removed) return sendError(res, 404, 'Blog not found');

      return res.json({ success: true, data: removed });
    } catch (err) {
      console.error('deleteBlog error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get blog stats
  getStats: expressAsyncHandler(async (req, res) => {
    try {
      const [totalBlogs, publishedBlogs, totalViews] = await Promise.all([
        Blog.countDocuments(),
        Blog.countDocuments({ published: true }),
        Blog.aggregate([
          { $group: { _id: null, total: { $sum: '$meta.views' } } }
        ]),
      ]);

      const stats = {
        total: totalBlogs,
        published: publishedBlogs,
        draft: totalBlogs - publishedBlogs,
        views: totalViews[0]?.total || 0,
      };

      return res.json({ success: true, data: stats });
    } catch (err) {
      console.error('getStats error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Like/unlike blog (toggle) — use atomic updates to avoid full-document validation
  likeBlog: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 401, 'User must be logged in to like');
      }

      // Read existing likedBy to determine toggle state
      const blog = await Blog.findOne({ slug }).select('likedBy meta');
      if (!blog) {
        return sendError(res, 404, 'Blog not found');
      }

      const userIdStr = userId.toString();
      const alreadyLiked = Array.isArray(blog.likedBy) && blog.likedBy.some(id => id.toString() === userIdStr);

      // Use atomic operators to avoid triggering validation on unrelated fields
      let update;
      if (alreadyLiked) {
        update = { $pull: { likedBy: new mongoose.Types.ObjectId(userId) }, $inc: { 'meta.likes': -1 } };
      } else {
        update = { $addToSet: { likedBy: new mongoose.Types.ObjectId(userId) }, $inc: { 'meta.likes': 1 } };
      }

      let updated = await Blog.findOneAndUpdate({ slug }, update, { new: true }).select('likedBy meta').lean();

      // Ensure meta.likes is not negative
      if (updated.meta && updated.meta.likes < 0) {
        updated = await Blog.findOneAndUpdate({ slug }, { $set: { 'meta.likes': 0 } }, { new: true }).select('likedBy meta').lean();
      }

      const likesCount = Array.isArray(updated.likedBy) ? updated.likedBy.length : (updated.meta?.likes ?? 0);

      res.json({
        success: true,
        likes: likesCount,
        isLiked: !alreadyLiked,
        message: alreadyLiked ? 'Unliked' : 'Liked',
      });
    } catch (err) {
      console.error('likeBlog error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Add comment
  addComment: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;
      const { text } = req.body;
      const userId = req.user?.id; // From auth middleware
      const userEmail = req.user?.email;

      if (!text || !text.trim()) {
        return sendError(res, 400, 'Comment text is required');
      }

      if (!userId) {
        return sendError(res, 401, 'User must be logged in to comment');
      }

      // Check if blog exists first
      const blogExists = await Blog.exists({ slug });
      if (!blogExists) return sendError(res, 404, 'Blog not found');

      // Get user name from another collection or use email
      const userName = req.user?.name || userEmail || 'User';

      const newComment = {
        _id: new mongoose.Types.ObjectId(),
        text: text.trim(),
        author: userName,
        userId: new mongoose.Types.ObjectId(userId), // Explicit cast
        userEmail: userEmail,
        createdAt: new Date(),
      };

      // Use atomic update to avoid full document validation
      const updatedBlog = await Blog.findOneAndUpdate(
        { slug },
        { $push: { comments: newComment } },
        { new: true, runValidators: false } // runValidators: false ensures we don't re-validate the whole blog
      ).select('comments');

      if (!updatedBlog) return sendError(res, 404, 'Blog not found');

      await addComment(userId);

      res.status(201).json({
        success: true,
        comment: newComment,
        totalComments: updatedBlog.comments.length,
        message: 'Comment added successfully',
      });
    } catch (err) {
      console.error('addComment error:', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Delete comment - only own comment
  deleteComment: expressAsyncHandler(async (req, res) => {
    try {
      const { slug, commentId } = req.params;
      const userId = req.user?.id; // From auth middleware

      if (!userId) {
        return sendError(res, 401, 'User must be logged in to delete comments');
      }

      const blog = await Blog.findOne({ slug }).select('comments');
      if (!blog) return sendError(res, 404, 'Blog not found');

      const comment = blog.comments.id(commentId);
      if (!comment) return sendError(res, 404, 'Comment not found');

      const commentUserIdStr = comment.userId?.toString();
      const userIdStr = userId.toString();

      if (commentUserIdStr !== userIdStr) {
        return sendError(res, 403, 'You can only delete your own comments');
      }

      // Use atomic update
      const updatedBlog = await Blog.findOneAndUpdate(
        { slug },
        { $pull: { comments: { _id: commentId } } },
        { new: true }
      ).select('comments');

      await removeComment(userId);

      res.json({
        success: true,
        message: 'Comment deleted successfully',
        totalComments: updatedBlog.comments.length,
      });
    } catch (err) {
      console.error('deleteComment error:', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get comments for a blog
  getComments: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;

      const blog = await Blog.findOne({ slug }).select('comments');
      if (!blog) return sendError(res, 404, 'Blog not found');

      res.json({
        success: true,
        comments: blog.comments,
        totalComments: blog.comments.length,
      });
    } catch (err) {
      console.error('getComments error:', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),
};

module.exports = blogController;

