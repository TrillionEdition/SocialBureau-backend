const test = require("node:test");
const assert = require("node:assert/strict");
const { getPagePaymentPrice, matchesPagePayment } = require("./pagePaymentSecurity");

test("uses a server-defined amount for the gated architecture page", () => {
  assert.equal(getPagePaymentPrice("youtube-architecture"), 299);
  assert.equal(getPagePaymentPrice("unknown-page"), undefined);
});

test("accepts only captured payments bound to the page and authenticated user", () => {
  const order = {
    id: "order-1",
    amount: 29900,
    currency: "INR",
    status: "paid",
    notes: { purpose: "gated-page", pageSlug: "youtube-architecture", userId: "user-1" },
  };
  const payment = {
    order_id: "order-1",
    amount: 29900,
    currency: "INR",
    status: "captured",
  };

  assert.equal(matchesPagePayment("youtube-architecture", "user-1", order, payment), true);
  assert.equal(matchesPagePayment("youtube-architecture", "user-2", order, payment), false);
  assert.equal(matchesPagePayment("different-page", "user-1", order, payment), false);
  assert.equal(matchesPagePayment("youtube-architecture", "user-1", { ...order, amount: 100 }, payment), false);
});
