const asyncHandler = require("express-async-handler");
const sanitizeHtml = require("sanitize-html");
const slugify = require("slugify");
const DynamicReport = require("./dynamicReportModel");
const uploadService = require("../../middlewares/cloudflare");

const MAX_SECTIONS = 40;
const MAX_TEXT_LENGTH = 30000;
const richTextOptions = {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "a", "code", "pre"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["https", "http", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

const invalid = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

function secureUrl(value, fieldName) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") invalid(`${fieldName} must use HTTPS`);
    return parsed.toString();
  } catch (error) {
    if (error.status) throw error;
    invalid(`${fieldName} must be a valid HTTPS URL`);
  }
}

function cleanSections(sections) {
  if (!Array.isArray(sections) || sections.length > MAX_SECTIONS) {
    invalid(`Reports must contain no more than ${MAX_SECTIONS} sections`);
  }

  const allowedTypes = new Set(["text", "kpi", "table", "chart", "image", "pdf"]);
  return sections.map((section, index) => {
    if (!section || !allowedTypes.has(section.type)) invalid("A section has an unsupported type");
    const content = typeof section.content === "string" ? section.content : "";
    if (content.length > MAX_TEXT_LENGTH) invalid("Section text is too long");
    const data = section.data && typeof section.data === "object" && !Array.isArray(section.data)
      ? section.data
      : {};
    if (section.type === "image" || section.type === "pdf") {
      data.url = secureUrl(data.url, "Uploaded file URL");
    }
    return {
      type: section.type,
      title: String(section.title || "").trim().slice(0, 160),
      content: sanitizeHtml(content, richTextOptions),
      data,
      order: index,
    };
  });
}

async function uniqueSlug(title, requestedSlug, currentId) {
  const baseSlug = slugify(requestedSlug || title, { lower: true, strict: true, trim: true }).slice(0, 100);
  if (!baseSlug) invalid("Report title must contain letters or numbers");
  let slug = baseSlug;
  let suffix = 2;
  while (await DynamicReport.exists({ slug, ...(currentId ? { _id: { $ne: currentId } } : {}) })) {
    slug = `${baseSlug}-${suffix++}`;
  }
  return slug;
}

function validUploadedFile(file) {
  if (!file) return false;
  const buffer = file.buffer;
  if (file.mimetype === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}

const controller = {
  listAdmin: asyncHandler(async (_req, res) => {
    const reports = await DynamicReport.find().sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: reports });
  }),

  getAdmin: asyncHandler(async (req, res) => {
    const report = await DynamicReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    res.json({ success: true, data: report });
  }),

  createAdmin: asyncHandler(async (req, res) => {
    const { title, subtitle, coverImageUrl, sections = [], status = "draft", slug } = req.body;
    if (!title || !String(title).trim()) invalid("Report title is required");
    if (!["draft", "published"].includes(status)) invalid("Invalid report status");
    const report = await DynamicReport.create({
      title: String(title).trim(),
      slug: await uniqueSlug(title, slug),
      subtitle: String(subtitle || "").trim(),
      coverImageUrl: secureUrl(coverImageUrl, "Cover image URL"),
      sections: cleanSections(sections),
      status,
      createdBy: req.user.name || req.user.email || "Admin",
    });
    res.status(201).json({ success: true, data: report });
  }),

  updateAdmin: asyncHandler(async (req, res) => {
    const report = await DynamicReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    const { title, subtitle, coverImageUrl, sections, status, slug } = req.body;
    if (status !== undefined && !["draft", "published"].includes(status)) invalid("Invalid report status");
    if (title !== undefined) {
      if (!String(title).trim()) invalid("Report title is required");
      report.title = String(title).trim();
    }
    if (subtitle !== undefined) report.subtitle = String(subtitle).trim();
    if (coverImageUrl !== undefined) report.coverImageUrl = secureUrl(coverImageUrl, "Cover image URL");
    if (sections !== undefined) report.sections = cleanSections(sections);
    if (status !== undefined) report.status = status;
    if (slug !== undefined) report.slug = await uniqueSlug(report.title, slug, report._id);
    await report.save();
    res.json({ success: true, data: report });
  }),

  deleteAdmin: asyncHandler(async (req, res) => {
    const report = await DynamicReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    const urls = [report.coverImageUrl, ...report.sections.filter((section) => ["image", "pdf"].includes(section.type)).map((section) => section.data?.url)];
    await Promise.all(urls.filter(Boolean).map((url) => uploadService.deleteFromR2(url)));
    res.json({ success: true });
  }),

  uploadAdmin: asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose an image or PDF" });
    if (!validUploadedFile(req.file)) {
      await uploadService.deleteFromR2(req.file.location);
      return res.status(400).json({ success: false, message: "File contents do not match an allowed image or PDF type" });
    }
    res.status(201).json({
      success: true,
      data: {
        url: req.file.location,
        fileName: req.file.originalname,
        type: req.file.mimetype === "application/pdf" ? "pdf" : "image",
      },
    });
  }),

  getPublic: asyncHandler(async (req, res) => {
    const report = await DynamicReport.findOne({ slug: req.params.slug, status: "published" }).lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ success: true, data: report });
  }),
};

module.exports = controller;