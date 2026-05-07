const nodemailer = require("nodemailer");

/**
 * Robust Mailer with Multi-Port Retry Logic
 * Specifically designed to bypass cloud firewall restrictions on Render/Vercel
 */
const sendMail = async ({ to, subject, html }) => {
  console.log(`\n📤 [MAILER] Starting dispatch sequence for: ${to}`);

  const mailOptions = {
    from: `"SocialBureau" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  // 1️⃣ Attempt 1: Port 465 (Direct SSL) - Most stable for cloud servers
  const tryPort465 = async () => {
    console.log("⏱️  [MAILER] Attempting Port 465 (SSL)...");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4, // 🔌 Force IPv4 to bypass Render IPv6 issues
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000, 
    });
    return await transporter.sendMail(mailOptions);
  };

  // 2️⃣ Attempt 2: Port 587 (STARTTLS) - Fallback
  const tryPort587 = async () => {
    console.log("⏱️  [MAILER] Port 465 failed. Trying Port 587 (TLS) with IPv4...");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4, // 🔌 Force IPv4
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
      requireTLS: true,
      connectionTimeout: 8000,
    });
    return await transporter.sendMail(mailOptions);
  };

  try {
    let info;
    try {
      info = await tryPort465();
    } catch (firstErr) {
      console.warn(`⚠️  [MAILER] Port 465 failed: ${firstErr.message}`);
      info = await tryPort587();
    }

    console.log("✅ [MAILER] Success! Message ID:", info.messageId);
    return info;
  } catch (finalErr) {
    console.error("❌ [MAILER] All connection attempts failed.");
    console.error(`Final Error Message: ${finalErr.message}`);

    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    // Return a descriptive error for the frontend
    const friendlyError = new Error(`Email delivery failed (SMTP_ERROR): ${finalErr.message}. Please check if Gmail is blocking the server.`);
    friendlyError.status = 500;
    throw friendlyError;
  }
};

module.exports = sendMail;