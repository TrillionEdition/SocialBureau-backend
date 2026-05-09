const nodemailer = require("nodemailer");

/**
 * GMAIL CLOUD-OPTIMIZED MAILER (IPv4 Force)
 * This version forces IPv4 to bypass common ISP and Cloud IPv6 timeout issues.
 */

const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: mailUser,
    pass: mailPass,
  },
  // 🛡️ Force IPv4 and add robust timeouts
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  dnsTimeout: 10000,
  // 🔥 The "Magic" setting for many cloud providers: Force IPv4
  socket: {
    family: 4
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  }
});

const sendMail = async ({ to, subject, html }) => {
  console.log(`\n📤 [MAILER] Attempting dispatch to: ${to}`);

  if (!mailUser || !mailPass) {
    console.warn("⚠️  SKIPPING EMAIL SEND: MAIL_USER or MAIL_PASS missing in .env");
    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Email would have been sent to:", to);
      return { messageId: "dev-mock-" + Date.now(), response: "250 OK (Mocked)" };
    }
    throw new Error("Missing email credentials");
  }

  const mailOptions = {
    from: `"SocialBureau" <${mailUser}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ [MAILER] Success! Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ [MAILER] Dispatch Failed.");
    console.error(`Error Type: ${err.name}`);
    console.error(`Error Message: ${err.message}`);

    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

// Verify transporter on startup ONLY if credentials exist
if (mailUser && mailPass) {
  transporter
    .verify()
    .then(() => {
      console.log("✅ [MAILER] Verified and Ready (IPv4 Forced)");
    })
    .catch((err) => {
      console.warn("⚠️  [MAILER] Verification Failed. This may be due to temporary network issues.");
      console.warn(`Reason: ${err.message}`);
    });
}

module.exports = sendMail;
module.exports.transporter = transporter;
