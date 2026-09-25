const mongoose = require('mongoose');

// Candidate resume listed for sale in the Resume Marketplace.
// Sensitive fields (candidateName, candidateEmail, candidatePhone, fullProfileSummary,
// resumeFileUrl) must NEVER be selected/returned by public/company "browse" endpoints —
// only by the payment-gated full-access endpoint.
const resumeListingSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, default: '', trim: true },
    candidatePhone: { type: String, default: '', trim: true },

    jobTitle: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    experienceMin: { type: Number, required: true, default: 0 },
    experienceMax: { type: Number, required: true, default: 0 },
    location: { type: String, required: true, trim: true, index: true },
    skills: [{ type: String, trim: true }],
    skillsSummary: { type: String, default: '' },

    education: [
      {
        degree: { type: String, default: '' },
        institution: { type: String, default: '' },
        year: { type: String, default: '' },
      },
    ],
    fullProfileSummary: { type: String, default: '' },

    resumeFileUrl: { type: String, required: true },
    resumeFileName: { type: String, default: '' },
    resumeFileType: { type: String, default: '' },

    isPublished: { type: Boolean, default: true, index: true },
    downloadCount: { type: Number, default: 0 },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

resumeListingSchema.index({ jobTitle: 'text', category: 'text', skills: 'text' });

// Fields safe to expose before payment.
resumeListingSchema.statics.BASIC_FIELDS =
  'jobTitle category experienceMin experienceMax location skills skillsSummary isPublished createdAt';

module.exports = mongoose.model('ResumeListing', resumeListingSchema);
