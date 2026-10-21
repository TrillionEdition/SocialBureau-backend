const mailer = require("../utils/sendMail");

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.sendContactMessage = async (req, res) => {
  const fields = ["name", "company", "role", "email", "website", "message"];
  const values = {};
  const body = req.body || {};

  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ success: false, message: `${field} is required.` });
    }
    values[field] = value.trim();
  }

  if (!isValidEmail(values.email)) {
    return res.status(400).json({ success: false, message: "Enter a valid email address." });
  }

  if (values.name.length > 120 || values.company.length > 160 || values.role.length > 120 ||
      values.email.length > 254 || values.website.length > 2048 || values.message.length > 5000) {
    return res.status(400).json({ success: false, message: "One or more fields exceed the allowed length." });
  }

  try {
    const website = new URL(values.website);
    if (!["http:", "https:"].includes(website.protocol)) throw new Error("Unsupported website protocol");
  } catch {
    return res.status(400).json({ success: false, message: "Enter a valid website URL." });
  }

  const senderEmail = process.env.BREVO_FROM_EMAIL;
  if (!process.env.BREVO_SMTP_KEY || !process.env.BREVO_SMTP_USER || !senderEmail) {
    console.error("[SUPPORT] Brevo SMTP is not fully configured.");
    return res.status(503).json({ success: false, message: "Message delivery is temporarily unavailable." });
  }

  const safeName = escapeHtml(values.name);
  const safeCompany = escapeHtml(values.company);
  const safeRole = escapeHtml(values.role);
  const safeEmail = escapeHtml(values.email);
  const safeWebsite = escapeHtml(values.website);
  const safeMessage = escapeHtml(values.message).replace(/\r?\n/g, "<br>");
  const text = [
    "New message submitted through the SocialBureau Contact page.",
    `Name: ${values.name}`,
    `Company: ${values.company}`,
    `Role: ${values.role}`,
    `Email: ${values.email}`,
    `Website: ${values.website}`,
    "",
    "Message:",
    values.message,
  ].join("\n");

  try {
    await mailer.transporter.sendMail({
      from: `"SocialBureau Support" <${senderEmail}>`,
      to: process.env.SUPPORT_EMAIL || "team@socialbureau.in",
      replyTo: values.email,
      subject: "New message from the SocialBureau Contact page",
      text,
      html: `
        <h2>New Contact Page Message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Company:</strong> ${safeCompany}</p>
        <p><strong>Role:</strong> ${safeRole}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Website:</strong> ${safeWebsite}</p>
        <p><strong>Message:</strong><br>${safeMessage}</p>
      `,
    });

    return res.status(200).json({ success: true, message: "Your message has been sent." });
  } catch (error) {
    console.error("[SUPPORT] Brevo message delivery failed:", error.message);
    return res.status(502).json({ success: false, message: "We could not send your message. Please try again." });
  }
};
