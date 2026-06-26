const mongoose = require("mongoose");

const auditReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Report category/type is required"],
      trim: true,
    },
    auditPeriod: {
      type: String,
      required: [true, "Audit period is required"],
      trim: true,
    },
    pdfUrl: {
      type: String,
      required: [true, "PDF URL is required"],
    },
    pdfFileName: {
      type: String,
      required: [true, "PDF file name is required"],
    },
    pdfSize: {
      type: Number, // In bytes
      required: [true, "PDF size is required"],
    },
    uploadedBy: {
      type: String, // Uploader name or email
      required: [true, "Uploaded by is required"],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
      index: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    amt: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const AuditReport = mongoose.model("AuditReport", auditReportSchema);

module.exports = AuditReport;
