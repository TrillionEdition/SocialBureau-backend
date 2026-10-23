function resolvePartnershipEntitlements(role, currentPartnership, requestedValues = {}) {
  const isAdmin = String(role || "").toLowerCase() === "admin";
  const current = currentPartnership || {};

  return {
    isFree: isAdmin && typeof requestedValues.isFree === "boolean"
      ? requestedValues.isFree
      : Boolean(current.isFree),
    hasPaid: isAdmin && typeof requestedValues.hasPaid === "boolean"
      ? requestedValues.hasPaid
      : Boolean(current.hasPaid),
  };
}

module.exports = resolvePartnershipEntitlements;
