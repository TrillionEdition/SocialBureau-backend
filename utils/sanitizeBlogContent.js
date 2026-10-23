const sanitizeHtml = require("sanitize-html");

const BLOG_HTML_OPTIONS = {
  allowedTags: [
    "a", "blockquote", "br", "code", "div", "em", "figcaption", "figure",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img", "li", "ol", "p",
    "pre", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
  ],
  allowedAttributes: {
    "*": ["class"],
    a: ["href", "name", "rel", "target"],
    img: ["src", "alt", "title", "width", "height"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

function sanitizeBlogContent(content) {
  if (!Array.isArray(content)) return content;
  return content.map((section) => {
    if (typeof section === "string") return sanitizeHtml(section, BLOG_HTML_OPTIONS);
    if (!section || typeof section !== "object" || typeof section.text !== "string") return section;
    return { ...section, text: sanitizeHtml(section.text, BLOG_HTML_OPTIONS) };
  });
}

function sanitizeBlogRecord(blog) {
  if (!blog || typeof blog !== "object") return blog;
  const record = typeof blog.toObject === "function" ? blog.toObject() : blog;
  return { ...record, content: sanitizeBlogContent(record.content) };
}

module.exports = { sanitizeBlogContent, sanitizeBlogRecord };
