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
  console.log("✅ Using default Gmail");
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    logger: true,
    debug: process.env.MAIL_DEBUG === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

const sendMail = async ({ to, subject, html }) => {
  console.log("\n📤 ===== SENDING EMAIL =====");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`FROM: "SocialBureau" <${process.env.MAIL_USER || "(none)"}>`);
  console.log(`HTML LENGTH: ${html ? html.length : 0} characters`);

  try {
    const info = await transporter.sendMail({
      from: `"SocialBureau" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error("\n❌ ===== EMAIL SEND FAILED =====");
    console.error(`ERROR MESSAGE: ${err.message}`);

    // 🔥 DEVELOPMENT FALLBACK: Log to console if offline/SMTP fails
    if (process.env.NODE_ENV !== "production") {
      console.log("\n🛠️  [DEV FALLBACK] Email would have been sent to:", to);
      console.log("🛠️  [DEV FALLBACK] HTML Content Preview:", html.substring(0, 500) + "...");
      console.log("✅ [DEV FALLBACK] Proceeding as success for local development.\n");
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