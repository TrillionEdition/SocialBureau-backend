const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhone, validateLeadInput, csvCell } = require("./digitalCardLeadUtils");

test("normalizes international phone numbers and rejects missing country codes", () => {
  assert.equal(normalizePhone("+91 (98765) 43210"), "+919876543210");
  assert.equal(normalizePhone("9876543210"), "");
  assert.equal(normalizePhone("+123"), "");
});

test("validates required fields, consent, email, and configured interests", () => {
  const { errors } = validateLeadInput({
    fullName: "Sham Visitor",
    phone: "+919876543210",
    email: "invalid",
    interest: "Unknown",
    consent: false,
  });
  assert.deepEqual(Object.keys(errors).sort(), ["consent", "email", "interest"]);

  const valid = validateLeadInput({
    fullName: "Sham Visitor",
    phone: "+91 98765 43210",
    email: "visitor@example.com",
    interest: "API Marketing",
    consent: true,
  });
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.lead.phone, "+919876543210");
});

test("escapes CSV cells and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('=IMPORT("data")'), `"'=IMPORT(""data"")"`);
});
