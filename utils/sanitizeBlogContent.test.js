const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeBlogContent } = require("./sanitizeBlogContent");

test("sanitizes scripts, event handlers, and unsafe links in blog content", () => {
  const [section] = sanitizeBlogContent([{
    type: "text",
    text: '<p onclick="alert(1)">Hello <strong>world</strong><script>alert(1)</script><a href="javascript:alert(1)">link</a></p>',
  }]);

  assert.equal(section.text.includes("<script"), false);
  assert.equal(section.text.includes("onclick"), false);
  assert.equal(section.text.includes("javascript:"), false);
  assert.ok(section.text.includes("<strong>world</strong>"));
});
