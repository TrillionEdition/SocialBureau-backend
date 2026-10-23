const test = require("node:test");
const assert = require("node:assert/strict");
const safeUserDetails = require("./safeUserDetails");

test("user detail allow-list omits credentials and unapproved fields", () => {
  assert.deepEqual(
    safeUserDetails({
      _id: "user-1",
      name: "Example",
      email: "example@example.com",
      password: "hash",
      resetPasswordToken: "reset",
      clickupToken: "token",
      permissions: ["admin"],
    }),
    { _id: "user-1", name: "Example", email: "example@example.com" }
  );
});
