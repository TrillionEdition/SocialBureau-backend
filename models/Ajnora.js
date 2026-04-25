const mongoose = require("mongoose");

const ajnoraSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    
    // Business & Strategy
    businessDescription: { type: String },
    priorityServices: { type: String },
    project: { type: String, trim: true }, // Used for specific expansion project name
    
    // Goals
    goals: [{ type: String }],
    goalsOther: { type: String },
    expansionPlans: { type: String },
    successVision: { type: String },
    
    // Audience & Market
    targetAudience: { type: String },
    competitors: { type: String },
    
    // Marketing
    currentActivities: [{ type: String }],
    currentActivitiesOther: { type: String },
    performanceHistory: { type: String },
    challenges: { type: String },
    
    // Operations
    leadHandling: { type: String },
    
    // Financials
    budget: { type: String },
    
    // Status & Management
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "lost", "converted"],
      default: "new",
    },
    notes: { type: String },
    assignedTo: { type: String, default: "Unassigned" }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ajnora", ajnoraSchema);
