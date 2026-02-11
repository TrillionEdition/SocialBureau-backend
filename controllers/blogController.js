const mongoose = require('mongoose');
const Blog = require('../models/blogModel');
const expressAsyncHandler = require('express-async-handler');
const {
  addLike,
  removeLike,
  addComment,
  removeComment,
} = require("../services/engagementService");

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

  // List all blog posts with filters
  listBlogs: expressAsyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        category,
        published,
        q,
        userId, // Add userId to query params
      } = req.query;

      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const filter = {};

      // Filter by user if provided
      if (userId) {
        filter.user = userId;
      }

      // Filter by published status
      if (published === 'all') {
        // Do not add filter.published to show both published and drafts
      } else if (published !== undefined) {
        filter.published = published === 'true' || published === '1' || published === true;
      } else {
        filter.published = true; // Default to only published blogs
      }
      
      if (category && category !== 'All Posts') filter.category = category;

      if (q) {
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { excerpt: { $regex: q, $options: 'i' } },
        ];
      }

      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        Blog.find(filter).skip(skip).limit(l).sort(sort).lean(),
        Blog.countDocuments(filter),
      ]);

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
      console.error('listBlogs error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get single blog by slug
  getBlogBySlug: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.params;
      const blog = await Blog.findOne({ slug })
        .populate('childBlogs', 'title slug excerpt image category')
        .lean();
        
      if (!blog) return sendError(res, 404, 'Blog not found');

      // Increment view count
      await Blog.findOneAndUpdate({ slug }, { $inc: { 'meta.views': 1 } });

      return res.json({ success: true, data: blog });
    } catch (err) {
      console.error('getBlogBySlug error', err);
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


likeBlog: expressAsyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id; // From auth middleware
    console.log("slug",slug);
    
    if (!userId) {
      return sendError(res, 401, 'User must be logged in to like');
    }

    const blog = await Blog.findOne({ slug });
    if (!blog) return sendError(res, 404, 'Blog not found');

    // Check if user already liked
    const userIdStr = userId.toString();
    const alreadyLiked = blog.likedBy.some(id => id.toString() === userIdStr);
    
if (alreadyLiked) {
  blog.likedBy = blog.likedBy.filter(id => id.toString() !== userIdStr);

  await removeLike(userId);
} else {
  blog.likedBy.push(userId);

  await addLike(userId);
}

    await blog.save();

    // ✅ Return total likes count and current user's like status
    res.json({
      success: true,
      likes: blog.likedBy.length, // Total unique likes
      isLiked: !alreadyLiked, // Current user's new status
      likedBy: blog.likedBy, // Full array for frontend validation
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
    });
  } catch (err) {
    console.error('likeBlog error:', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

// ✅ ADD COMMENT - With user tracking
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

    const blog = await Blog.findOne({ slug });
    if (!blog) return sendError(res, 404, 'Blog not found');

    // Get user name from another collection or use email
    const userName = req.user?.name || userEmail || "User";

    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      text: text.trim(),
      author: userName, // ✅ Use actual username
      userId: userId,
      userEmail: userEmail,
      createdAt: new Date(),
    };

    blog.comments.push(newComment);
    await blog.save();
    await addComment(userId);


    console.log(`Comment added by ${userId} on blog ${slug}`);

    res.status(201).json({
      success: true,
      comment: newComment,
      totalComments: blog.comments.length,
      message: 'Comment added successfully',
    });
  } catch (err) {
    console.error('addComment error:', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

// ✅ DELETE COMMENT - Only own comments
deleteComment: expressAsyncHandler(async (req, res) => {
  try {
    const { slug, commentId } = req.params;
    const userId = req.user?.id; // From auth middleware

    console.log(`Delete attempt - slug: ${slug}, commentId: ${commentId}, userId: ${userId}`);

    if (!userId) {
      return sendError(res, 401, 'User must be logged in to delete comments');
    }

    const blog = await Blog.findOne({ slug });
    if (!blog) return sendError(res, 404, 'Blog not found');

    const comment = blog.comments.id(commentId);
    console.log(`Comment found:`, comment);
    
    if (!comment) return sendError(res, 404, 'Comment not found');

    // ✅ Only allow user to delete their own comment
    const commentUserIdStr = comment.userId?.toString();
    const userIdStr = userId.toString();

    console.log(`Ownership check - commentUserIdStr: ${commentUserIdStr}, userIdStr: ${userIdStr}`);

    if (commentUserIdStr !== userIdStr) {
      return sendError(res, 403, 'You can only delete your own comments');
    }

    // ✅ Remove the comment from the array using proper ObjectId
    const result = blog.comments.pull({ _id: new mongoose.Types.ObjectId(commentId) });
    console.log(`Pull result:`, result);
    
    await blog.save();
    console.log(`Blog saved after comment deletion`);

    await removeComment(userId);


    console.log(`Comment ${commentId} deleted by user ${userId}`);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      totalComments: blog.comments.length,
    });
  } catch (err) {
    console.error('deleteComment error:', err);
    return sendError(res, 500, 'Internal server error', err.message);
  }
}),

// ✅ GET COMMENTS - Public
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

