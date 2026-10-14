const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { verifyPaymentSignature, verifyWebhookSignature } = require("./campaignPayment");

test("verifies Razorpay payment signatures and rejects altered values", () => {
  const payload = "order_test_123|pay_test_456";
  const signature = crypto.createHmac("sha256", "test-secret").update(payload).digest("hex");
  assert.equal(verifyPaymentSignature("order_test_123", "pay_test_456", signature, "test-secret"), true);
  assert.equal(verifyPaymentSignature("order_test_123", "pay_test_456", signature, "wrong-secret"), false);
  assert.equal(verifyPaymentSignature("order_test_123", "pay_other", signature, "test-secret"), false);
});

test("verifies webhook signatures against the exact raw request body", () => {
  const rawBody = Buffer.from('{"event":"payment.captured"}');
  const signature = crypto.createHmac("sha256", "webhook-secret").update(rawBody).digest("hex");
  assert.equal(verifyWebhookSignature(rawBody, signature, "webhook-secret"), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{ "event":"payment.captured"}'), signature, "webhook-secret"), false);
});