// utils/sendMail.js - WITH DETAILED DEBUGGING

const nodemailer = require("nodemailer");

let transporter;

if (process.env.MAIL_HOST) {
  // console.log("✅ Using custom MAIL_HOST");
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    logger: true,
    debug: process.env.MAIL_DEBUG === "true",
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
  });
} else if (process.env.MAIL_SERVICE) {
  // console.log(`✅ Using MAIL_SERVICE: ${process.env.MAIL_SERVICE}`);
  transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    logger: true,
    debug: process.env.MAIL_DEBUG === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
} else {
  console.log("✅ Using default Gmail (Port 465)");
  transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    logger: true,
    debug: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

const sendMail = async ({ to, subject, html }) => {
  const maskedUser = process.env.MAIL_USER 
    ? `${process.env.MAIL_USER.substring(0, 3)}...${process.env.MAIL_USER.split('@')[1] || ''}` 
    : "(none)";

  console.log("\n📤 ===== SENDING EMAIL =====");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`FROM: "SocialBureau" <${maskedUser}>`);
  console.log(`HTML LENGTH: ${html ? html.length : 0} characters`);

  const mailOptions = {
    from: `"SocialBureau" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    // ⏱️ Create a hard timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SMTP_TIMEOUT: Email server took too long to respond (15s limit)")), 15000)
    );

    // 🏎️ Race the email sending against the timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);

    console.log("✅ EMAIL DISPATCHED SUCCESSFULLY:", info.messageId);
    return info;
  } catch (err) {
    console.error("\n❌ ===== EMAIL SEND FAILED =====");
    console.error(`ERROR MESSAGE: ${err.message}`);

    // 🔥 DEVELOPMENT FALLBACK: Log to console if offline/SMTP fails
    if (process.env.NODE_ENV !== "production") {
      console.log("\n🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    throw err;
  }
};

// // Verify transporter on startup
// console.log("\n🔐 ===== VERIFYING MAILER =====");
transporter
  .verify()
  .then(() => {
    console.log(" MAILER VERIFIED AND READY");
  })
  .catch((err) => {
    console.error(" MAILER VERIFICATION FAILED");
    console.error(`ERROR: ${err.message}`);
  });

module.exports = sendMail;