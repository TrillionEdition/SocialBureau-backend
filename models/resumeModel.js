const mongoose = require('mongoose');

const ResumeDraftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      default: 'Untitled Resume'
    },
    template: {
      type: String,
      enum: ['modern', 'professional', 'creative', 'minimal', 'atsOptimized'],
      default: 'modern'
    },
    data: {
      personalInfo: {
        fullName: String,
        email: String,
        phone: String,
        location: String,
        linkedin: String,
        portfolio: String,
        title: String,
        summary: String
      },
      experience: [
        {
          position: String,
          company: String,
          duration: String,
          description: String
        }
      ],
      education: [
        {
          degree: String,
          field: String,
          institution: String,
          year: String
        }
      ],
      skills: [String],
      projects: [
        {
          title: String,
          description: String,
          link: String
        }
      ],
      certifications: [String],
      languages: [String]
    },
    atsScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
ResumeDraftSchema.index({ userId: 1, createdAt: -1 });
ResumeDraftSchema.index({ userId: 1, isPrimary: 1 });

const ResumeDraft = mongoose.model('ResumeDraft', ResumeDraftSchema);

module.exports = ResumeDraft;
