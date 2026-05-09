// utils/sendMail.js - WITH DETAILED DEBUGGING

const nodemailer = require("nodemailer");

let transporter;

const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;

if (process.env.MAIL_HOST) {
  // console.log("✅ Using custom MAIL_HOST");
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: mailUser,
      pass: mailPass,
    },
    logger: true,
    debug: process.env.MAIL_DEBUG === "true",
  });
} else if (process.env.MAIL_SERVICE) {
  // console.log(`✅ Using MAIL_SERVICE: ${process.env.MAIL_SERVICE}`);
  transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
    logger: true,
    debug: process.env.MAIL_DEBUG === "true",
  });
} else {
  console.log("✅ Using default Gmail service");
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: mailUser,
      pass: mailPass,
    },
    logger: true,
    debug: process.env.MAIL_DEBUG === "true",
  });
}

const sendMail = async ({ to, subject, html }) => {
  console.log("\n📤 ===== SENDING EMAIL =====");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`FROM: "SocialBureau" <${mailUser || "(none)"}>`);
  console.log(`HTML LENGTH: ${html ? html.length : 0} characters`);

  if (!mailUser || !mailPass) {
    console.warn("⚠️  SKIPPING EMAIL SEND: MAIL_USER or MAIL_PASS missing in .env");
    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Email would have been sent to:", to);
      return { messageId: "dev-mock-" + Date.now(), response: "250 OK (Mocked due to missing credentials)" };
    }
    throw new Error("Missing email credentials");
  }

  try {
    const info = await transporter.sendMail({
      from: `"SocialBureau" <${mailUser}>`,
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
      console.log("🛠️  [DEV FALLBACK] HTML Content Preview:", html ? html.substring(0, 500) + "..." : "(empty)");
      console.log("✅ [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    throw err;
  }
};

// Verify transporter on startup ONLY if credentials exist
if (mailUser && mailPass) {
  transporter
    .verify()
    .then(() => {
      console.log("✅ MAILER VERIFIED AND READY");
    })
    .catch((err) => {
      console.error("❌ MAILER VERIFICATION FAILED");
      console.error(`ERROR: ${err.message}`);
    });
} else {
  console.warn("⚠️  MAILER NOT CONFIGURED: Set MAIL_USER and MAIL_PASS in .env to enable emails.");
}

module.exports = sendMail;
module.exports.transporter = transporter;