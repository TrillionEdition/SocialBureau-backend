const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateCampaignPrice, validateCampaignBooking } = require("./campaignService");

test("calculates Basic and Age-Restricted totals in paise", () => {
  assert.deepEqual(calculateCampaignPrice(10000, "Basic"), {
    baseAmount: 3500,
    campaignGst: 630,
    subtotal: 4130,
    estimatedRazorpayFee: 123.9,
    estimatedRazorpayFeeGst: 22.3,
    total: 4276.2,
    totalPaise: 427620,
    currency: "INR",
  });
  assert.equal(calculateCampaignPrice(10000, "Age-Restricted").total, 6108.86);
});

test("rejects invalid views and bookings less than 30 minutes ahead", () => {
  assert.throws(() => calculateCampaignPrice(10500, "Basic"));
  assert.throws(() => calculateCampaignPrice(10000, "unknown"));
  assert.throws(() => validateCampaignBooking({
    channelName: "Channel",
    channelId: "UC1234567890",
    channelUrl: "https://youtube.com/watch?v=abcdefghijk",
    campaignStartAt: new Date(29 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    requestedViews: 10000,
    campaignType: "Basic",
  }, 0));
});

test("accepts a valid future YouTube campaign and returns UTC date", () => {
  const now = Date.UTC(2026, 0, 1);
  const booking = validateCampaignBooking({
    channelName: "Channel",
    channelId: "UC1234567890",
    channelUrl: "https://www.youtube.com/live/abcdefghijk",
    campaignStartAt: new Date(now + 31 * 60 * 1000).toISOString(),
    durationMinutes: "90",
    requestedViews: "10000",
    campaignType: "Basic",
  }, now);
  assert.equal(booking.startAt.toISOString(), new Date(now + 31 * 60 * 1000).toISOString());
  assert.equal(booking.pricingBreakdown.totalPaise, 427620);
});