const CAMPAIGN_PRICING = Object.freeze({
  Basic: Object.freeze({ ratePerThousand: 350 }),
  "Age-Restricted": Object.freeze({ ratePerThousand: 500 }),
  gstRate: 18,
  razorpayFeeRate: 3,
  minViews: 10000,
  maxViews: 100000,
  bookingLeadTimeMs: 30 * 60 * 1000,
});

const roundPaise = (value) => Math.round(value);

function calculateCampaignPrice(requestedViews, campaignType) {
  const category = CAMPAIGN_PRICING[campaignType];
  if (!category || !Number.isInteger(requestedViews) || requestedViews < CAMPAIGN_PRICING.minViews || requestedViews > CAMPAIGN_PRICING.maxViews || requestedViews % 1000 !== 0) {
    throw new Error("Invalid campaign type or requested views");
  }

  const basePaise = requestedViews / 1000 * category.ratePerThousand * 100;
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
    rates: { Basic: CAMPAIGN_PRICING.Basic.ratePerThousand, "Age-Restricted": CAMPAIGN_PRICING["Age-Restricted"].ratePerThousand },
    gstRate: CAMPAIGN_PRICING.gstRate,
    razorpayFeeRate: CAMPAIGN_PRICING.razorpayFeeRate,
    minViews: CAMPAIGN_PRICING.minViews,
    maxViews: CAMPAIGN_PRICING.maxViews,
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
  const required = ["channelName", "channelId", "channelUrl", "campaignStartAt", "durationMinutes", "requestedViews", "campaignType"];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || String(input[field]).trim() === "") {
      throw new Error(`${field} is required`);
    }
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
  const pricingBreakdown = calculateCampaignPrice(requestedViews, input.campaignType);
  return { startAt, durationMinutes, requestedViews, pricingBreakdown };
}

module.exports = { CAMPAIGN_PRICING, calculateCampaignPrice, getCampaignPricingConfig, validateCampaignBooking };