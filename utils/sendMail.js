const nodemailer = require("nodemailer");
const dns = require("dns");

// Force IPv4 DNS resolution globally — fixes Render's IPv6-default timeout with Gmail SMTP
dns.setDefaultResultOrder("ipv4first");

/**
 * PRODUCTION-READY MAILER
 * Supports Brevo, SendGrid, and Gmail SMTP
 * Port 2525 is used for SendGrid to bypass Render's firewall blocks.
 */

/**
 * Creates a transporter instance for sending emails
 * Used by emailService.js for direct transporter access
 */
const createTransporter = () => {
  // MODE 0: Brevo SMTP
  if (process.env.BREVO_SMTP_KEY) {
    return nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
    });
  }
  // 🛡️ MODE 1: SendGrid (Recommended for Render)
  if (process.env.SENDGRID_API_KEY) {
    console.log("🚀 [MAILER] Initializing SendGrid on Port 2525 (Render Optimized)");
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 2525, // Bypasses Render's firewall blocks
      auth: {
        user: "apikey", // This is literally the string "apikey"
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } 
  // 🛡️ MODE 2: Gmail (Fallback/Local)
  else {
    console.log("⏱️  [MAILER] No SMTP provider key found. Initializing Gmail fallback...");
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }
};

// Create transporter instance for export
const transporter = createTransporter();

const sendMail = async ({ to, subject, html }) => {
  console.log("\n[MAILER] Starting dispatch sequence");

  const mailOptions = {
    from: `"SocialBureau" <${process.env.BREVO_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ [MAILER] Success! Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("Email dispatch failed", { name: err.name, code: err.code });

    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    throw new Error("Email delivery failed. Check the configured SMTP provider credentials and network access.");
  }
};

module.exports = sendMail;
module.exports.transporter = transporter;
module.exports.createTransporter = createTransporter;
