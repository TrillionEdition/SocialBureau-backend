const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, html }) => {
  console.log(`\n📤 [MAILER] Attempting dispatch to: ${to}`);

  // 🚀 CLOUD-OPTIMIZED CONFIGURATION (Best for Render/Vercel)
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Must be false for Port 587
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Bypass certificate issues on cloud servers
      minVersion: "TLSv1.2"
    },
    requireTLS: true,
  });

  const mailOptions = {
    from: `"SocialBureau" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    // ⏱️ 20-second timeout to give cloud networks enough time
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SMTP_TIMEOUT: The email server did not respond in time (20s).")), 20000)
    );

    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);

    console.log("✅ [MAILER] Success! Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ [MAILER] Failed to send email.");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);

    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    throw err;
  }
};

module.exports = sendMail;