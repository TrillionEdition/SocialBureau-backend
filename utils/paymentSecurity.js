const crypto = require("crypto");

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (
    typeof orderId !== "string"
    || typeof paymentId !== "string"
    || typeof signature !== "string"
    || typeof secret !== "string"
    || !/^[a-f\d]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function matchesAuditReportPayment(report, order, payment) {
  const reportAmount = Number(report?.amt);
  return Number.isFinite(reportAmount)
    && reportAmount > 0
    && order?.amount === Math.round(reportAmount * 100)
    && order?.currency === "INR"
    && order?.notes?.purpose === "audit-report"
    && order?.notes?.reportId === String(report._id)
    && order?.status === "paid"
    && payment?.order_id === order.id
    && payment?.amount === order.amount
    && payment?.currency === order.currency
    && payment?.status === "captured";
}

function isEligibleFreeAuditReport(report) {
  return report?.status === "published" && Number(report.amt) === 0;
}

module.exports = {
  verifyRazorpaySignature,
  matchesAuditReportPayment,
  isEligibleFreeAuditReport,
};
