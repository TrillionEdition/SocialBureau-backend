const test = require("node:test");
const assert = require("node:assert/strict");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");
const User = require("../models/userModel");
const userRoutes = require("./userRoutes");
const achievementRoutes = require("./achievementRoutes");
const newsletterRoutes = require("./newsletterRoutes");
const apiLeadRoutes = require("./apiLeadRoutes");
const jobRoutes = require("./jobRoutes");
const jobApplicationRoutes = require("./jobApplicationRoutes");
const paymentRoutes = require("./paymentRoutes");
const pdfRoutes = require("./pdfRoutes");
const jobApplicationController = require("../controllers/jobApplicationController");
const blogRoutes = require("./blogRoutes");
const optionalAuthentication = require("../middlewares/optionalAuthentication");
const {
  passwordResetLimiter,
  otpVerificationLimiter,
  pdfLimiter,
} = require("../middlewares/rateLimiter");
const { MAX_UPLOAD_FILES } = require("../utils/multerUtils");

function routeHandlers(router, path, method) {
  const routeLayer = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(routeLayer, `missing ${method.toUpperCase()} ${path} route`);
  return routeLayer.route.stack.map((layer) => layer.handle);
}

test("sensitive user and administrative routes require authentication and admin authorization", () => {
  const protectedRoutes = [
    [userRoutes, "/tools", "put"],
    [userRoutes, "/clients", "put"],
    [achievementRoutes, "/user-details/:name", "get"],
    [newsletterRoutes, "/send-test", "post"],
    [apiLeadRoutes, "/", "get"],
    [jobRoutes, "/debug/all", "get"],
    [jobApplicationRoutes, "/job-applicants/:jobId", "get"],
  ];

  for (const [router, path, method] of protectedRoutes) {
    const handlers = routeHandlers(router, path, method);
    assert.equal(handlers[0], userAuthentication, `${method.toUpperCase()} ${path} must authenticate first`);
    assert.equal(handlers[1], isAdmin, `${method.toUpperCase()} ${path} must require admin authorization`);
  }
});

test("blog routes establish optional identity before serving draft-sensitive queries", () => {
  for (const path of ["/", "/:slug"]) {
    assert.equal(routeHandlers(blogRoutes, path, "get")[0], optionalAuthentication);
  }
});

test("password recovery routes enforce dedicated abuse limits", () => {
  const handlers = routeHandlers(userRoutes, "/verify-otp", "post");
  assert.equal(handlers[0], passwordResetLimiter);
  assert.equal(handlers[1], otpVerificationLimiter);
});

test("paid page content is served only behind authentication", () => {
  const handlers = routeHandlers(paymentRoutes, "/page-content/:pageSlug", "get");
  assert.equal(handlers[0], userAuthentication);
});

test("public PDF conversion routes have a dedicated limiter and upload count cap", () => {
  assert.equal(pdfRoutes.stack[0].handle, pdfLimiter);
  assert.equal(MAX_UPLOAD_FILES, 5);
});

test("user credential and ClickUp token fields are excluded from queries and serialization", () => {
  for (const field of ["password", "resetPasswordToken", "resetPasswordExpires", "clickupToken"]) {
    assert.equal(User.schema.path(field).options.select, false, `${field} should be excluded by default`);
  }

  const serialized = User.schema.options.toJSON.transform(null, {
    password: "hash",
    resetPasswordToken: "reset",
    resetPasswordExpires: new Date(),
    clickupToken: "token",
    name: "Safe",
  });
  assert.deepEqual(serialized, { name: "Safe" });
  assert.equal(User.schema.path("role").defaultValue, "user");
});

test("job application ownership routes reject cross-user access", async () => {
  for (const controller of [
    jobApplicationController.getUserApplications,
    jobApplicationController.getSavedJobs,
  ]) {
    let statusCode;
    let body;
    const response = {
      status(code) { statusCode = code; return this; },
      json(value) { body = value; return this; },
    };
    await controller(
      { params: { userId: "another-user" }, user: { id: "authenticated-user" } },
      response
    );
    assert.equal(statusCode, 403);
    assert.match(body.message, /own/);
  }
});
