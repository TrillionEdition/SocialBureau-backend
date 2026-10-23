const test = require("node:test");
const assert = require("node:assert/strict");
const registrationRole = require("./registrationRole");

test("public registration cannot choose a privileged role", () => {
  for (const role of ["admin", "partner", "partnership", "client"]) {
    assert.equal(registrationRole(role, false), "user");
  }
});

test("admin registration accepts only known roles", () => {
  assert.equal(registrationRole("admin", true), "admin");
  assert.equal(registrationRole("partner", true), "partner");
  assert.equal(registrationRole("unexpected", true), "user");
});
