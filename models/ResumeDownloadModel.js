const mongoose = require('mongoose');

// Records every resume a company has unlocked. The unique compound index both
// serves as the download-history log AND guarantees a company is never charged
// twice for accessing the same resume (repeat access after unlock is free).
const resumeDownloadSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeListing', required: true, index: true },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumePurchase', required: true },
  },
  { timestamps: true }
);

resumeDownloadSchema.index({ companyId: 1, resumeId: 1 }, { unique: true });

module.exports = mongoose.model('ResumeDownload', resumeDownloadSchema);
