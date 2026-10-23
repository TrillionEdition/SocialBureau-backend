const INTERESTS = [
  "API Marketing",
  "Digital Marketing",
  "YouTube Campaign Optimisation",
  "SEO / AEO / GEO",
  "Marketing Automation",
  "Business Partnership",
  "Other",
];

const STATUSES = ["new", "contacted", "follow_up", "converted", "closed"];

function normalizePhone(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return "";
  const digits = trimmed.slice(1).replace(/[\s().-]/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : "";
}

function validateLeadInput(input) {
  const errors = {};
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const phone = normalizePhone(input.phone);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const company = typeof input.company === "string" ? input.company.trim() : "";
  const designation = typeof input.designation === "string" ? input.designation.trim() : "";
  const interest = typeof input.interest === "string" ? input.interest.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";

  if (!fullName || fullName.length > 120) errors.fullName = "Enter a name up to 120 characters.";
  if (!phone) errors.phone = "Enter a valid international number with country code.";
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = "Enter a valid email address.";
  }
  if (company.length > 160) errors.company = "Company must be 160 characters or fewer.";
  if (designation.length > 120) errors.designation = "Designation must be 120 characters or fewer.";
  if (interest && !INTERESTS.includes(interest)) errors.interest = "Select a valid business interest.";
  if (message.length > 2000) errors.message = "Message must be 2000 characters or fewer.";
  if (input.consent !== true) errors.consent = "Consent is required.";

  return {
    errors,
    lead: { fullName, phone, email, company, designation, interest, message },
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${(/^[\s]*[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
}

module.exports = { INTERESTS, STATUSES, normalizePhone, validateLeadInput, csvCell };
