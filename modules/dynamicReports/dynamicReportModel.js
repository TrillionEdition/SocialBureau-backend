const mongoose = require("mongoose");

const reportSectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "kpi", "table", "chart", "image", "pdf"],
      required: true,
    },
    title: { type: String, trim: true, maxlength: 160, default: "" },
    content: { type: String, default: "" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const dynamicReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, index: true },
    subtitle: { type: String, trim: true, maxlength: 300, default: "" },
    coverImageUrl: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    sections: { type: [reportSectionSchema], default: [] },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DynamicReport", dynamicReportSchema);