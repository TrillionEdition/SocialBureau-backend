const test = require("node:test");
const assert = require("node:assert/strict");
const { allowedOrigins, isAllowedOrigin } = require("./securityConfig");

test("CORS allows configured website origins and non-browser requests only", () => {
  for (const origin of allowedOrigins) assert.equal(isAllowedOrigin(origin), true);
  assert.equal(isAllowedOrigin(undefined), true);
  assert.equal(isAllowedOrigin("https://attacker.example"), false);
});
