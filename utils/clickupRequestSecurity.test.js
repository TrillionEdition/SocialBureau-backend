const test = require("node:test");
const assert = require("node:assert/strict");
const { isClickUpApiUrl } = require("./clickupRequestSecurity");

test("ClickUp credentials are restricted to the exact HTTPS API host", () => {
  assert.equal(isClickUpApiUrl("https://api.clickup.com/api/v2/task/1"), true);
  assert.equal(isClickUpApiUrl("http://api.clickup.com/api/v2/task/1"), false);
  assert.equal(isClickUpApiUrl("https://api.clickup.com.attacker.example/api/v2/task/1"), false);
  assert.equal(isClickUpApiUrl("https://attacker.example/api.clickup.com"), false);
  assert.equal(isClickUpApiUrl("/api/v2/task/1", "https://api.clickup.com"), true);
});
