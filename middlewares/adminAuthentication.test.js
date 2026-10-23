const test = require("node:test");
const assert = require("node:assert/strict");
const adminAuthentication = require("./adminAuthentication");
const campaignRoutes = require("../routes/campaignRoutes");

test("allows an admin role and rejects an ordinary client role", () => {
  let passed = false;
  adminAuthentication({ user: { role: "admin" } }, { status() { throw new Error("unexpected rejection"); } }, () => { passed = true; });
  assert.equal(passed, true);

  let statusCode;
  const response = { status(code) { statusCode = code; return this; }, json() { return this; } };
  adminAuthentication({ user: { role: "client" } }, response, () => { throw new Error("client passed admin authorization"); });
  assert.equal(statusCode, 403);
});

test("campaign rate updates run admin authorization before the controller", () => {
  const updateRoute = campaignRoutes.stack.find((layer) => layer.route && layer.route.path === "/campaigns/admin/pricing" && layer.route.methods.patch);
  assert.ok(updateRoute);
  const handlers = updateRoute.route.stack.map((layer) => layer.handle);
  assert.equal(handlers[1], adminAuthentication);

  let statusCode;
  let controllerReached = false;
  const response = { status(code) { statusCode = code; return this; }, json() { return this; } };
  handlers[1]({ user: { role: "client" } }, response, () => { controllerReached = true; });
  assert.equal(statusCode, 403);
  assert.equal(controllerReached, false);
});