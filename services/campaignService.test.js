const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateCampaignEndAt, calculateCampaignPrice, validateCampaignBooking } = require("./campaignService");

const baseInput = {
  clientName: "Client",
  clientEmail: "client@example.com",
  channelName: "Channel",
  channelId: "UC1234567890",
  channelUrl: "https://www.youtube.com/live/abcdefghijk",
  durationMinutes: 60,
  requestedViews: 10000,
  campaignType: "Basic",
};

test("calculates hourly totals in paise", () => {
  assert.deepEqual(calculateCampaignPrice(1000, 60, "Basic"), {
    baseAmount: 350,
    campaignGst: 63,
    subtotal: 413,
    estimatedRazorpayFee: 12.39,
    estimatedRazorpayFeeGst: 2.23,
    total: 427.62,
    totalPaise: 42762,
    currency: "INR",
  });
  assert.equal(calculateCampaignPrice(1000, 60, "Age-Restricted").baseAmount, 500);
});

test("prices fractional hours", () => {
  assert.equal(calculateCampaignPrice(1000, 90, "Basic").baseAmount, 525);
  assert.equal(calculateCampaignPrice(1000, 30, "Age-Restricted").baseAmount, 250);
});

test("rejects invalid duration and type", () => {
  assert.throws(() => calculateCampaignPrice(1000, 0, "Basic"));
  assert.throws(() => calculateCampaignPrice(1000, 1441, "Basic"));
  assert.throws(() => calculateCampaignPrice(1000, 60, "unknown"));
});

test("end time crosses midnight", () => {
  const end = calculateCampaignEndAt("2026-01-01T23:30:00.000Z", 90);
  assert.equal(end.toISOString(), "2026-01-02T01:00:00.000Z");
});

test("rejects bookings less than 30 minutes ahead and bad email", () => {
  assert.throws(() => validateCampaignBooking({ ...baseInput, campaignStartAt: new Date(29 * 60 * 1000).toISOString() }, 0), /30 minutes/);
  assert.throws(() => validateCampaignBooking({ ...baseInput, clientEmail: "nope", campaignStartAt: new Date(31 * 60 * 1000).toISOString() }, 0), /email/);
});

test("accepts a valid booking; price scales with views", () => {
  const now = Date.UTC(2026, 0, 1);
  const startIso = new Date(now + 31 * 60 * 1000).toISOString();
  const a = validateCampaignBooking({ ...baseInput, campaignStartAt: startIso, durationMinutes: "90" }, now);
  const b = validateCampaignBooking({ ...baseInput, campaignStartAt: startIso, durationMinutes: "90", requestedViews: "15000" }, now);
  assert.equal(a.endAt.toISOString(), new Date(now + 121 * 60 * 1000).toISOString());
  assert.equal(a.pricingBreakdown.baseAmount, 525 * 10);
  assert.equal(b.pricingBreakdown.baseAmount, 525 * 15);
});

test('enforces per-type view caps', () => {
  const now = Date.UTC(2026, 0, 1);
  const input = { ...baseInput, campaignStartAt: new Date(now + 31 * 60 * 1000).toISOString() };
  assert.throws(() => validateCampaignBooking({ ...input, requestedViews: 20001 }, now), /custom rate/);
  assert.ok(validateCampaignBooking({ ...input, requestedViews: 20000 }, now));
  assert.ok(validateCampaignBooking({ ...input, campaignType: 'Age-Restricted', requestedViews: 35000 }, now));
  assert.throws(() => validateCampaignBooking({ ...input, campaignType: 'Age-Restricted', requestedViews: 35001 }, now), /custom rate/);
});
