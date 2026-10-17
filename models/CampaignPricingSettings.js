const mongoose = require("mongoose");

const rateField = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    message: "Campaign rates must have at most two decimal places",
  },
};

const campaignPricingSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: "campaign-pricing" },
  rates: {
    Basic: rateField,
    "Age-Restricted": rateField,
  },
}, { timestamps: true });

module.exports = mongoose.model("CampaignPricingSettings", campaignPricingSettingsSchema);