const test = require("node:test");
const assert = require("node:assert/strict");
const { getPageContentForAccess } = require("./protectedPageContent");

test("does not return gated content without a matching entitlement", () => {
  assert.equal(getPageContentForAccess("youtube-architecture", []), null);
  assert.equal(getPageContentForAccess("youtube-architecture", undefined), null);
});

test("returns page content only for a recognized, entitled page", () => {
  const content = getPageContentForAccess("youtube-architecture", ["youtube-architecture"]);
  assert.equal(content.hero.eyebrow, "FOR REPORTER TV");
  assert.equal(getPageContentForAccess("unknown-page", ["unknown-page"]), undefined);
});
