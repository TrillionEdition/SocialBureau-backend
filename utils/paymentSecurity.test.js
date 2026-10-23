const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const {
  verifyRazorpaySignature,
  matchesAuditReportPayment,
  isEligibleFreeAuditReport,
} = require("./paymentSecurity");

const secret = "test-secret";
const orderId = "order_test_123";
const paymentId = "pay_test_456";
const signature = crypto
  .createHmac("sha256", secret)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

test("verifies Razorpay signatures and rejects malformed or forged signatures", () => {
  assert.equal(verifyRazorpaySignature(orderId, paymentId, signature, secret), true);
  assert.equal(verifyRazorpaySignature(orderId, "pay_other", signature, secret), false);
  assert.equal(verifyRazorpaySignature(orderId, paymentId, "forged", secret), false);
});

test("accepts only captured report payments bound to the report and server price", () => {
  const report = { _id: "report-1", amt: 12.5 };
  const order = {
    id: orderId,
    amount: 1250,
    currency: "INR",
    status: "paid",
    notes: { purpose: "audit-report", reportId: "report-1" },
  };
  const payment = {
    order_id: orderId,
    amount: 1250,
    currency: "INR",
    status: "captured",
  };

  assert.equal(matchesAuditReportPayment(report, order, payment), true);
  assert.equal(matchesAuditReportPayment(report, { ...order, amount: 1 }, payment), false);
  assert.equal(matchesAuditReportPayment(report, { ...order, notes: { ...order.notes, reportId: "other" } }, payment), false);
  assert.equal(matchesAuditReportPayment(report, order, { ...payment, status: "authorized" }), false);
});

test("only published zero-price reports can use the no-payment flow", () => {
  assert.equal(isEligibleFreeAuditReport({ status: "published", amt: 0 }), true);
  assert.equal(isEligibleFreeAuditReport({ status: "published", amt: 1 }), false);
  assert.equal(isEligibleFreeAuditReport({ status: "draft", amt: 0 }), false);
});
