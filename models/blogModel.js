const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
      unique: true,
    },
    excerpt: {
      type: String,
      trim: true,
    },
    customUrl: {
      // custom URL path for the blog (alternative to slug)
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // allows null/undefined but must be unique if provided
      index: true,
    },
    keywords: {
      // SEO keywords for the blog
      type: [String],
      default: [],
    },
    childBlogs: {
      // references to related/child blog posts
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Blog",
      default: [],
    },
    content: {
      // array of content sections with text and optional images
      type: [
        {
          type: {
            type: String,
            enum: ["text", "image", "mixed"],
            default: "text",
          },
          text: {
            type: String, // rich text HTML content
            trim: true,
          },
          image: {
            type: String, // image URL/path for this section
            trim: true,
          },
          heading: {
            type: String,
            enum: ["h1", "h2", "h3", "h4", "h5", "h6", "none"],
            default: "none",
          },
        },
      ],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "content must be a non-empty array of content sections",
      },
    },
    // meta: {
    //   views: { type: Number, default: 0 },
    //   likes: { type: Number, default: 0 },
    //   shares: { type: Number, default: 0 },
    // },
    comments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        text: {
          type: String,
          required: true,
        },
        author: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userEmail: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    authorName: {
      type: String,
      trim: true,
      required: true,
    },
    authorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    readingTime: {
      // stores values like "7 min read"
      type: String,
      trim: true,
    },
    image: {
      type: String, // path or URL
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
      default: "general",
    },
    published: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    meta: {
      // place for future metadata (SEO, promos...)
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
