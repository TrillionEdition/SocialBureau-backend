const test = require("node:test");
const assert = require("node:assert/strict");
const resolvePartnershipEntitlements = require("./partnershipEntitlements");

test("users cannot grant themselves free or paid partnership access", () => {
  assert.deepEqual(
    resolvePartnershipEntitlements("user", null, { isFree: true, hasPaid: true }),
    { isFree: false, hasPaid: false }
  );
});

test("users preserve existing partnership entitlements without overriding them", () => {
  assert.deepEqual(
    resolvePartnershipEntitlements("partner", { isFree: false, hasPaid: false }, { isFree: true, hasPaid: true }),
    { isFree: false, hasPaid: false }
  );
});

test("admins may explicitly manage partnership entitlements", () => {
  assert.deepEqual(
    resolvePartnershipEntitlements("admin", null, { isFree: true, hasPaid: true }),
    { isFree: true, hasPaid: true }
  );
});
