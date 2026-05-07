const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, html }) => {
  // 🔐 Always create a fresh transporter for production reliability
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    // 🔥 Critical for cloud hosting like Render
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
  });

  const maskedUser = process.env.MAIL_USER 
    ? `${process.env.MAIL_USER.substring(0, 3)}...${process.env.MAIL_USER.split('@')[1] || ''}` 
    : "(none)";

  console.log("\n📤 ===== ATTEMPTING EMAIL DISPATCH =====");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`FROM: "SocialBureau" <${maskedUser}>`);

  const mailOptions = {
    from: `"SocialBureau" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    // ⏱️ Hard 15s timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SMTP_TIMEOUT: The email server did not respond in time.")), 15000)
    );

    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);

    console.log("✅ EMAIL DISPATCHED SUCCESSFULLY:", info.messageId);
    return info;
  } catch (err) {
    console.error("\n❌ ===== EMAIL SEND FAILED =====");
    console.error(`ERROR TYPE: ${err.name}`);
    console.error(`ERROR MESSAGE: ${err.message}`);

    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    throw err;
  }
};

module.exports = sendMail;