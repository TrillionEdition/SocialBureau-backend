// const Blog = require("../models/blogModel");

// const getLatestPublishedBlog = async () => {
//   return await Blog.findOne({ published: true })
//     .sort({ publishedAt: -1 })
//     .select(
//       "title slug customUrl excerpt image authorName readingTime publishedAt content"
//     )
//     .lean();
// };

// module.exports = {
//   getLatestPublishedBlog,
// };




const Blog = require("../models/blogModel");
const Job = require("../models/JobModel");


const getLatestPublishedBlog = async () => {
  return await Blog.findOne({ published: true })
    .sort({ publishedAt: -1 })
    .select(
      "title slug customUrl excerpt image authorName readingTime publishedAt content"
    )
    .lean();
};

const getLatestActiveJob = async () => {
  return await Job.findOne({ isActive: true })
    .sort({ createdAt: -1 })
    .select(
      "title slug department employment location description applyLink createdAt"
    )
    .lean();
};

module.exports = {
  getLatestPublishedBlog,
  getLatestActiveJob,
};
