const mongoose = require('mongoose');
const Blog = require('../models/blogModel');
const generateSitemaps = require('../scripts/generateSitemaps');
const expressAsyncHandler = require('express-async-handler');
const {
  addComment,
  removeComment,
} = require('../services/engagementService');
const { getCache, setCache, invalidateCache, invalidateBlogCaches, CACHE_EXPIRY } = require("../utils/Cacheutils");
const { deleteFromR2 } = require('../middlewares/cloudflare');

function sendError(res, status = 400, message = 'Bad Request', details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

const blogController = {
  // Create a new blog post
  createBlog: expressAsyncHandler(async (req, res) => {
    try {
      console.log('📥 Incoming Create Blog Request');
      console.log('Body Keys:', Object.keys(req.body));
      console.log('Files:', req.files ? Object.keys(req.files) : 'None');

      const { title, excerpt, content, category, author, slug, customUrl, keywords, childBlogs, seoTitle, seoDescription } = req.body;

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
          section.image = files[sectionImageKey][0].location; // R2 URL
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
        imageUrl = files.image[0].location; // R2 URL
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

      // Invalidate cache
      await invalidateBlogCaches();

      // regenerate sitemaps in background
      generateSitemaps().catch(err => console.error('sitemap generation failed after create:', err));
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      console.error('createBlog error', err);
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return sendError(res, 400, 'Validation Error', messages.join(', '));
      }
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return sendError(res, 400, `Duplicate Error: A blog with this ${field} already exists.`);
      }
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // List blogs
  getBlogs: expressAsyncHandler(async (req, res) => {
    try {
      const { category, limit = 10, published } = req.query;
      console.log('📚 getBlogs called with params:', { category, limit, published });

      let query = {};
      if (published === 'all') {
        // Show everything
      } else if (published === 'false') {
        query.published = false;
      } else {
        // Default: only show published
        query.published = true;
      }
      if (category && category !== 'All Posts') {
        query.category = category;
      }

      console.log('🔍 Querying blogs with:', query);

      // Redis caching
      const cacheKey = `blogs:list:${JSON.stringify(query)}:${limit}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log('⚡ Redis Cache Hit: getBlogs');
        return res.json({ success: true, data: cachedData });
      }

      const blogs = await Blog.find(query)
        .sort('-createdAt')
        .limit(parseInt(limit))
        .lean();

      console.log(`✅ Found ${blogs.length} blogs`);

      // Cache the result
      await setCache(cacheKey, blogs, CACHE_EXPIRY.BLOGS_LIST);

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

      // Redis caching
      const cacheKey = `blog:${slug}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log('⚡ Redis Cache Hit: getBlogBySlug');
        return res.json({ success: true, data: cachedData });
      }

      const blog = await Blog.findOne({ slug })
        .populate('childBlogs', 'title slug excerpt image category')
        .lean();

      if (!blog) {
        console.log('❌ Blog not found for slug:', slug);
        return sendError(res, 404, 'Blog not found');
      }

      console.log('✅ Blog found:', blog.title);

      // Cache the result
      await setCache(cacheKey, blog, CACHE_EXPIRY.SINGLE_BLOG);

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

      const cacheKey = `blogs:latest:${l}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData });
      }

      const blogs = await Blog.find({ published: true })
        .sort('-createdAt')
        .limit(l)
        .lean();

      await setCache(cacheKey, blogs, CACHE_EXPIRY.BLOGS_LIST);

      return res.json({ success: true, data: blogs });
    } catch (err) {
      console.error('getLatestBlogs error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Update blog
  updateBlog: expressAsyncHandler(async (req, res) => {
    try {
      const { slug: oldSlug } = req.params;
      const userId = req.user?._id || req.user?.id;
      const isAdminUser = req.user?.role?.toLowerCase() === 'admin';

      // Find original blog first for ownership check
      const blog = await Blog.findOne({ slug: oldSlug });
      if (!blog) return sendError(res, 404, 'Blog not found');

      // Authorization Check: Admin or Owner
      const isOwner = blog.user && blog.user.toString() === userId.toString();
      if (!isAdminUser && !isOwner) {
        return sendError(res, 403, 'Access denied. You can only edit your own blogs.');
      }

      // Extract fields from body
      const { title, excerpt, content, category, author, customUrl, keywords, childBlogs, seoTitle, seoDescription, published } = req.body;
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (excerpt !== undefined) updates.excerpt = excerpt;
      if (category !== undefined) updates.category = category;
      if (author !== undefined) updates.authorName = author;
      if (customUrl !== undefined) updates.customUrl = customUrl;
      if (published !== undefined) {
        updates.published = published === 'true' || published === true;
        if (updates.published) updates.publishedAt = new Date();
      }

      // Parse complex fields if they come as strings (FormData)
      if (content) {
        try {
          updates.content = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
          return sendError(res, 400, 'Invalid content format');
        }
      }

      if (keywords) {
        try {
          updates.keywords = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;
        } catch (e) {
          updates.keywords = keywords.split(',').map(k => k.trim());
        }
      }

      if (childBlogs) {
        try {
          updates.childBlogs = typeof childBlogs === 'string' ? JSON.parse(childBlogs) : childBlogs;
        } catch (e) {
          updates.childBlogs = [];
        }
      }

      if (seoTitle || seoDescription) {
        updates.seo = {
          title: seoTitle || blog.seo?.title || updates.title || blog.title,
          description: seoDescription || blog.seo?.description || updates.excerpt || blog.excerpt || '',
        };
      }

      // Process uploaded files
      const files = req.files || {};

      // Main image update
      if (files.image && files.image[0]) {
        // Delete old image if it exists and is different
        if (blog.image) {
          await deleteFromR2(blog.image);
        }
        updates.image = files.image[0].location;
      } else if (req.body.image && typeof req.body.image === 'string') {
        updates.image = req.body.image; // Keep existing URL
      } else if (req.body.imageUrl) {
        updates.image = req.body.imageUrl;
      }

      // Section images update
      if (updates.content && Array.isArray(updates.content)) {
        updates.content = await Promise.all(updates.content.map(async (section, index) => {
          const sectionImageKey = `sectionImage_${index}`;
          if (files[sectionImageKey] && files[sectionImageKey][0]) {
            // Delete old section image if it exists
            const oldSection = blog.content[index];
            if (oldSection && oldSection.image) {
              await deleteFromR2(oldSection.image);
            }
            section.image = files[sectionImageKey][0].location;
          }
          return section;
        }));
      }

      // Validate word count
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

      // Handle slug update if title changed
      if (updates.title && updates.title !== blog.title) {
        let newSlug = updates.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const existing = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
        if (existing) newSlug = `${newSlug}-${Date.now()}`;
        updates.slug = newSlug;
      }

      const updated = await Blog.findOneAndUpdate({ slug: oldSlug }, updates, {
        new: true,
      }).lean();

      // Invalidate cache
      await invalidateBlogCaches();
      await invalidateCache(`blog:${oldSlug}`);
      if (updated.slug !== oldSlug) {
        await invalidateCache(`blog:${updated.slug}`);
      }

      generateSitemaps().catch(err => console.error('sitemap generation failed after update:', err));
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
      const userId = req.user?._id || req.user?.id;
      const isAdminUser = req.user?.role?.toLowerCase() === 'admin';

      const blog = await Blog.findOne({ slug });
      if (!blog) return sendError(res, 404, 'Blog not found');

      // Authorization Check
      const isOwner = blog.user && blog.user.toString() === userId.toString();
      if (!isAdminUser && !isOwner) {
        return sendError(res, 403, 'Access denied. You can only delete your own blogs.');
      }

      // Delete images from R2 before removing the blog record
      if (blog.image) {
        await deleteFromR2(blog.image);
      }
      
      if (blog.content && Array.isArray(blog.content)) {
        for (const section of blog.content) {
          if (section.image) {
            await deleteFromR2(section.image);
          }
        }
      }

      const removed = await Blog.findOneAndDelete({ slug }).lean();

      // Invalidate cache
      await invalidateBlogCaches();
      await invalidateCache(`blog:${slug}`);

      generateSitemaps().catch(err => console.error('sitemap generation failed after delete:', err));

      return res.json({ success: true, data: removed });
    } catch (err) {
      console.error('deleteBlog error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get blog stats
  getStats: expressAsyncHandler(async (req, res) => {
    try {
      const cacheKey = "blogs:stats";
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData });
      }

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

      await setCache(cacheKey, stats, CACHE_EXPIRY.BLOGS_LIST);

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
