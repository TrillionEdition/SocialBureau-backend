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
  });
}

const sendMail = async ({ to, subject, html }) => {
  console.log("\n📤 ===== SENDING EMAIL =====");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`FROM: "SocialBureau" <${process.env.MAIL_USER || "(none)"}>`);
  console.log(`HTML LENGTH: ${html ? html.length : 0} characters`);

  try {
    // console.log("🔄 Connecting to SMTP server...");
    
    const info = await transporter.sendMail({
      from: `"SocialBureau" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    
    // console.log("✅ ===== EMAIL SENT SUCCESSFULLY =====");
    // console.log(`Message ID: ${info.messageId}`);
    // console.log(`Response: ${info.response}`);
    // console.log("=============================\n");
    
    return info;
  } catch (err) {
    console.error("\n❌ ===== EMAIL SEND FAILED =====");
    console.error(`ERROR TYPE: ${err.name}`);
    console.error(`ERROR MESSAGE: ${err.message}`);
    console.error(`ERROR CODE: ${err.code}`);
    console.error(`FULL ERROR:`, err);
    // console.error("=============================\n");
    
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