const PAGE_PAYMENT_PRICES_INR = Object.freeze({
  "youtube-architecture": 299,
});

function getPagePaymentPrice(pageSlug) {
  return PAGE_PAYMENT_PRICES_INR[pageSlug];
}

function matchesPagePayment(pageSlug, userId, order, payment) {
  const price = getPagePaymentPrice(pageSlug);
  return Number.isFinite(price)
    && order?.amount === Math.round(price * 100)
    && order?.currency === "INR"
    && order?.status === "paid"
    && order?.notes?.purpose === "gated-page"
    && order?.notes?.pageSlug === pageSlug
    && order?.notes?.userId === String(userId)
    && payment?.order_id === order.id
    && payment?.amount === order.amount
    && payment?.currency === order.currency
    && payment?.status === "captured";
}

module.exports = { getPagePaymentPrice, matchesPagePayment };
