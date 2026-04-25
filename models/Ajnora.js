const mongoose = require("mongoose");

/**
 * Ajnora Master Intelligence Model
 * Captures all 67+ data points from the Phase 01 Intelligence Intake Form.
 * Optimized for MongoDB with flexible schemas for nested social and asset data.
 */
const ajnoraSchema = new mongoose.Schema(
  {
    // --- SECTION 0: COMPANY PROFILE ---
    legalName: { type: String, trim: true },
    brandName: { type: String, trim: true },
    companyType: { type: String },
    incYear: { type: String },
    cin: { type: String, trim: true },
    gst: { type: String, trim: true },
    regAddress: { type: String },
    regCity: { type: String },
    regDistrict: { type: String },
    regPin: { type: String },
    svcAddress: { type: String },
    svcCity: { type: String },
    svcDistrict: { type: String },
    svcPin: { type: String },
    contactName: { type: String, required: true, trim: true },
    contactDesig: { type: String },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    partnersList: { type: mongoose.Schema.Types.Mixed, default: [] }, // Array of {name, role}
    brandFace: { type: String },
    brandFaceLink: { type: String },

    // --- SECTION 1: LEGAL & DOCUMENTS ---
    legalChecks: [{ type: String }],
    legalPending: { type: String },
    legalQuery: { type: String },
    uploadedFiles: { type: mongoose.Schema.Types.Mixed, default: {} }, // Map of category: [files]

    // --- SECTION 2: SERVICES & EXPANSION ---
    coreOffering: { type: String },
    serviceCategories: [{ type: String }],
    otherServices: { type: String },
    targetAudience: { type: String },
    ageGroup: { type: String },
    geoExpansion: { type: String },
    currentOps: [{ type: String }],
    expansionTarget: [{ type: String }],
    mktFocus: { type: String },
    usp: { type: String },
    enrolled: { type: String },
    successRate: { type: String },

    // --- SECTION 3: DIGITAL PRESENCE ---
    website: { type: String },
    webStatus: { type: String },
    socialMedia: { type: mongoose.Schema.Types.Mixed, default: {} }, // ig, fb, yt, etc.
    igFollowers: { type: String },
    fbFollowers: { type: String },
    ytSubs: { type: String },
    gmb: { type: String },
    gmbReviews: { type: String },
    assetOwnership: { type: String },
    accessIssues: { type: String },

    // --- SECTION 4: MARKETING & LEAD SOURCES ---
    hasAgency: { type: String },
    agencyName: { type: String },
    currentMktActivities: { type: String },
    leadVolume: { type: String },
    leadConversion: { type: String },
    leadSources: { type: mongoose.Schema.Types.Mixed, default: [] }, // Array of {label, link}
    engRate: { type: String },
    postFreq: { type: String },
    mktChallenges: { type: String },
    servicesNeeded: { type: mongoose.Schema.Types.Mixed, default: [] }, // Array of {label, link}
    mktGoals: { type: String },

    // --- SECTION 5: BUDGET & TIMELINE ---
    selectedBudget: { type: String },
    adSpend: { type: String },
    contractDur: { type: String },
    startDate: { type: String },
    milestone: { type: String },
    decisionProcess: { type: String },
    anythingElse: { type: String },
    referralSource: { type: String },
    referredBy: { type: String },

    // --- METADATA & PIPELINE MANAGEMENT ---
    project: { type: String, default: "Ajinora Phase 01" },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "lost", "converted"],
      default: "new",
    },
    notes: { type: String },
    assignedTo: { type: String, default: "Unassigned" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" }
  },
  {
    timestamps: true,
  }
);

// Add text search for dashboard efficiency
ajnoraSchema.index({ 
    legalName: 'text', 
    brandName: 'text', 
    contactEmail: 'text', 
    contactName: 'text' 
});

module.exports = mongoose.model("Ajnora", ajnoraSchema);
