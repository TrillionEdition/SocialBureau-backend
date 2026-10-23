const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/userModel");
const { getCurrentRole } = require("./currentUserRole");

test("rechecks administrator token roles against the current user record", async () => {
  const originalFindById = User.findById;
  let queriedUserId;
  User.findById = (userId) => {
    queriedUserId = userId;
    return {
      select: () => ({
        lean: async () => ({ role: "user" }),
      }),
    };
  };

  try {
    assert.equal(await getCurrentRole("user-1", "admin"), "user");
    assert.equal(queriedUserId, "user-1");
  } finally {
    User.findById = originalFindById;
  }
});

test("does not query the database for non-administrator token roles", async () => {
  const originalFindById = User.findById;
  User.findById = () => {
    throw new Error("non-admin role should not require a role lookup");
  };

  try {
    assert.equal(await getCurrentRole("user-1", "user"), "user");
  } finally {
    User.findById = originalFindById;
  }
});
