const envNumber = (name, fallback) => {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== "" && Number.isFinite(value) && value >= 0 ? value : fallback;
};

const CAMPAIGN_PRICING = Object.freeze({
  Basic: Object.freeze({ ratePerHour: envNumber("CAMPAIGN_RATE_BASIC", 350), maxViews: envNumber("CAMPAIGN_MAX_VIEWS_BASIC", 20000) }),
  "Age-Restricted": Object.freeze({ ratePerHour: envNumber("CAMPAIGN_RATE_AGE_RESTRICTED", 500), maxViews: envNumber("CAMPAIGN_MAX_VIEWS_AGE_RESTRICTED", 35000) }),
  gstRate: envNumber("CAMPAIGN_GST_RATE", 18),
  razorpayFeeRate: envNumber("CAMPAIGN_RAZORPAY_FEE_RATE", 3),
  minViews: 1000,
  maxViews: 10000000,
  bookingLeadTimeMs: 30 * 60 * 1000,
});

const roundPaise = (value) => Math.round(value);

function calculateCampaignEndAt(startAt, durationMinutes) {
  return new Date(new Date(startAt).getTime() + durationMinutes * 60 * 1000);
}

function calculateCampaignPrice(requestedViews, durationMinutes, campaignType) {
  const category = CAMPAIGN_PRICING[campaignType];
  if (!category || !category.ratePerHour || !Number.isInteger(requestedViews) || requestedViews < 1 || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    throw new Error("Invalid campaign type, views or duration");
  }

  // Rate is per 1,000 views per hour.
  const basePaise = roundPaise(category.ratePerHour * 100 * (requestedViews / 1000) * durationMinutes / 60);
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

function getCampaignPricingConfig() {
  return {
    rates: { Basic: CAMPAIGN_PRICING.Basic.ratePerHour, "Age-Restricted": CAMPAIGN_PRICING["Age-Restricted"].ratePerHour },
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

function validateCampaignBooking(input, now = Date.now()) {
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

  const durationMinutes = Number(input.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    throw new Error("Duration must be between 1 and 1440 minutes");
  }

  const requestedViews = Number(input.requestedViews);
  if (!Number.isInteger(requestedViews) || requestedViews < CAMPAIGN_PRICING.minViews) {
    throw new Error(`Requested views must be at least ${CAMPAIGN_PRICING.minViews}`);
  }
  const maxViews = CAMPAIGN_PRICING[input.campaignType]?.maxViews;
  if (maxViews && requestedViews > maxViews) {
    throw new Error(`Above ${maxViews.toLocaleString("en-IN")} views for ${input.campaignType} needs a custom rate. Please contact SocialBureau.`);
  }
  const pricingBreakdown = calculateCampaignPrice(requestedViews, durationMinutes, input.campaignType);
  return { startAt, endAt: calculateCampaignEndAt(startAt, durationMinutes), durationMinutes, requestedViews, pricingBreakdown };
}

module.exports = { CAMPAIGN_PRICING, calculateCampaignEndAt, calculateCampaignPrice, getCampaignPricingConfig, validateCampaignBooking };