const envNumber = (name, fallback) => {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== "" && Number.isFinite(value) && value >= 0 ? value : fallback;
};
const CampaignPricingSettings = require("../models/CampaignPricingSettings");

const DEFAULT_CAMPAIGN_RATES = Object.freeze({ Basic: 350, "Age-Restricted": 500 });

const CAMPAIGN_PRICING = Object.freeze({
  Basic: Object.freeze({ maxViews: envNumber("CAMPAIGN_MAX_VIEWS_BASIC", 20000) }),
  "Age-Restricted": Object.freeze({ maxViews: envNumber("CAMPAIGN_MAX_VIEWS_AGE_RESTRICTED", 35000) }),
  gstRate: envNumber("CAMPAIGN_GST_RATE", 18),
  razorpayFeeRate: envNumber("CAMPAIGN_RAZORPAY_FEE_RATE", 3),
  minViews: 1000,
  maxViews: 10000000,
  bookingLeadTimeMs: 30 * 60 * 1000,
});

const roundPaise = (value) => Math.round(value);

// Prices are pre-tax rupees. Plan C is charged per 1,000 views per hour.
const CAMPAIGN_PLANS = Object.freeze({
  A: Object.freeze({ name: "Plan A", views: 6000, durationMinutes: 18 * 60, dailyPrice: 5700, monthlyPrice: 171000, monthlyDays: 30 }),
  B: Object.freeze({ name: "Plan B", views: 100000, durationMinutes: 60, price: 21200 }),
  C: Object.freeze({ name: "Plan C", defaultViews: 1000, ratePer1000ViewsPerHour: 250 }),
});
const DEFAULT_PLAN = "C";

function resolvePlan(input) {
  const plan = input.plan === undefined || input.plan === "" ? DEFAULT_PLAN : input.plan;
  if (!CAMPAIGN_PLANS[plan]) throw new Error("Choose a valid plan (A, B or C)");
  const billing = plan === "A" && input.billing === "monthly" ? "monthly" : "daily";
  const config = CAMPAIGN_PLANS[plan];
  if (plan === "A") return { plan, billing, requestedViews: config.views, durationMinutes: config.durationMinutes, days: billing === "monthly" ? config.monthlyDays : 1, basePrice: billing === "monthly" ? config.monthlyPrice : config.dailyPrice };
  if (plan === "B") return { plan, billing, requestedViews: config.views, durationMinutes: config.durationMinutes, days: 1, basePrice: config.price };
  return { plan, billing, requestedViews: Number(input.requestedViews), durationMinutes: Number(input.durationMinutes), days: 1, basePrice: null };
}

function calculateCampaignEndAt(startAt, durationMinutes, days = 1) {
  return new Date(new Date(startAt).getTime() + ((days - 1) * 24 * 60 + durationMinutes) * 60 * 1000);
}

function validateCampaignRates(rates) {
  const validated = {};
  for (const campaignType of Object.keys(DEFAULT_CAMPAIGN_RATES)) {
    const rate = rates && rates[campaignType];
    const paise = Number(rate) * 100;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || Math.abs(paise - Math.round(paise)) > Number.EPSILON * Math.max(1, Math.abs(paise)) * 2) {
      throw new Error(`${campaignType} rate must be a finite, non-negative amount with at most two decimal places`);
    }
    validated[campaignType] = rate;
  }
  return validated;
}

async function getSavedCampaignRates(settingsModel = CampaignPricingSettings) {
  const settings = await settingsModel.findOneAndUpdate(
    { _id: "campaign-pricing" },
    { $setOnInsert: { rates: DEFAULT_CAMPAIGN_RATES } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return validateCampaignRates(settings.rates);
}

async function updateSavedCampaignRates(rates, settingsModel = CampaignPricingSettings) {
  const validatedRates = validateCampaignRates(rates);
  const settings = await settingsModel.findOneAndUpdate(
    { _id: "campaign-pricing" },
    { $set: { rates: validatedRates } },
    { upsert: true, new: true, runValidators: true },
  );
  return validateCampaignRates(settings.rates);
}

function calculateCampaignPrice(requestedViews, durationMinutes, campaignType, rates = DEFAULT_CAMPAIGN_RATES, planInput = {}) {
  const validatedRates = validateCampaignRates(rates);
  const category = CAMPAIGN_PRICING[campaignType];
  const resolved = resolvePlan({ ...planInput, requestedViews, durationMinutes });
  if (!category || !Number.isInteger(resolved.requestedViews) || resolved.requestedViews < 1 || !Number.isInteger(resolved.durationMinutes) || resolved.durationMinutes < 1 || resolved.durationMinutes > 1440) {
    throw new Error("Invalid campaign type, views or duration");
  }

  const pricePer1000ViewsPerHour = validatedRates[campaignType];
  const basePaise = resolved.basePrice !== null
    ? roundPaise(resolved.basePrice * 100)
    : roundPaise(pricePer1000ViewsPerHour * 100 * (resolved.requestedViews / 1000) * resolved.durationMinutes / 60);
  const gstPaise = roundPaise(basePaise * CAMPAIGN_PRICING.gstRate / 100);
  const subtotalPaise = basePaise + gstPaise;
  const processingFeePaise = roundPaise(subtotalPaise * CAMPAIGN_PRICING.razorpayFeeRate / 100);
  const processingFeeGstPaise = roundPaise(processingFeePaise * CAMPAIGN_PRICING.gstRate / 100);
  const totalPaise = subtotalPaise + processingFeePaise + processingFeeGstPaise;

  return {
    baseAmount: basePaise / 100,
    campaignGst: gstPaise / 100,
    subtotal: subtotalPaise / 100,
    estimatedRazorpayFee: processingFeePaise / 100,
    estimatedRazorpayFeeGst: processingFeeGstPaise / 100,
    total: totalPaise / 100,
    totalPaise,
    currency: "INR",
  };
}

function getCampaignPricingConfig(rates = DEFAULT_CAMPAIGN_RATES) {
  return {
    plans: CAMPAIGN_PLANS,
    defaultPlan: DEFAULT_PLAN,
    rates: validateCampaignRates(rates),
    gstRate: CAMPAIGN_PRICING.gstRate,
    razorpayFeeRate: CAMPAIGN_PRICING.razorpayFeeRate,
    minViews: CAMPAIGN_PRICING.minViews,
    maxViews: { Basic: CAMPAIGN_PRICING.Basic.maxViews, "Age-Restricted": CAMPAIGN_PRICING["Age-Restricted"].maxViews },
  };
}

function isYoutubeVideoUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!(["http:", "https:"].includes(url.protocol))) return false;
  const hostname = url.hostname.toLowerCase();
  const idPattern = /^[\w-]{6,}$/;
  if (["youtu.be", "www.youtu.be"].includes(hostname)) return idPattern.test(url.pathname.split("/").filter(Boolean)[0] || "");
  if (!["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)) return false;
  if (url.pathname === "/watch") return idPattern.test(url.searchParams.get("v") || "");
  return /^\/(?:live|shorts|embed)\/[\w-]{6,}\/?$/.test(url.pathname);
}

function validateCampaignBooking(input, now = Date.now(), rates = DEFAULT_CAMPAIGN_RATES) {
  const required = ["clientName", "clientEmail", "channelName", "channelId", "channelUrl", "campaignStartAt", "durationMinutes", "requestedViews", "campaignType"];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || String(input[field]).trim() === "") {
      throw new Error(`${field} is required`);
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.clientEmail).trim()) || String(input.clientEmail).length > 254) {
    throw new Error("Enter a valid client email");
  }

  if (!isYoutubeVideoUrl(input.channelUrl.trim())) {
    throw new Error("Enter a valid YouTube video or live URL");
  }

  if (typeof input.campaignStartAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(input.campaignStartAt)) {
    throw new Error("Campaign start must include an explicit timezone");
  }
  const startAt = new Date(input.campaignStartAt);
  if (!Number.isFinite(startAt.getTime()) || startAt.getTime() < now + CAMPAIGN_PRICING.bookingLeadTimeMs) {
    throw new Error("Campaign must start at least 30 minutes from now");
  }

  const resolved = resolvePlan(input);
  const durationMinutes = resolved.durationMinutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    throw new Error("Duration must be between 1 and 1440 minutes");
  }

  const requestedViews = resolved.requestedViews;
  if (!Number.isInteger(requestedViews) || requestedViews < CAMPAIGN_PRICING.minViews) {
    throw new Error(`Requested views must be at least ${CAMPAIGN_PRICING.minViews}`);
  }
  const maxViews = CAMPAIGN_PRICING[input.campaignType]?.maxViews ?? CAMPAIGN_PRICING.maxViews;
  if (requestedViews > maxViews) {
    throw new Error(`custom rate required for ${input.campaignType} bookings above ${maxViews.toLocaleString("en-IN")} views`);
  }
  const pricingBreakdown = calculateCampaignPrice(requestedViews, durationMinutes, input.campaignType, rates, input);
  return { startAt, endAt: calculateCampaignEndAt(startAt, durationMinutes, resolved.days), durationMinutes, requestedViews, pricingBreakdown, plan: resolved.plan, billing: resolved.billing };
}

module.exports = {
  CAMPAIGN_PLANS,
  CAMPAIGN_PRICING,
  DEFAULT_CAMPAIGN_RATES,
  calculateCampaignEndAt,
  calculateCampaignPrice,
  getCampaignPricingConfig,
  getSavedCampaignRates,
  updateSavedCampaignRates,
  validateCampaignBooking,
  validateCampaignRates,
};