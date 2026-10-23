const pageContent = require("../content/pageContent");
const { getPagePaymentPrice } = require("./pagePaymentSecurity");

function getPageContentForAccess(pageSlug, paidPages) {
  if (!Number.isFinite(getPagePaymentPrice(pageSlug))) return undefined;
  if (!Array.isArray(paidPages) || !paidPages.includes(pageSlug)) return null;
  return pageContent[pageSlug];
}

module.exports = { getPageContentForAccess };
