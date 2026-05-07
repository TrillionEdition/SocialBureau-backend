const nodemailer = require("nodemailer");

/**
 * GMAIL CLOUD-OPTIMIZED MAILER (IPv4 Force)
 * This version forces IPv4 to bypass Render's common IPv6 timeout issues.
 */
const sendMail = async ({ to, subject, html }) => {
  console.log(`\n📤 [MAILER] Attempting IPv4-forced dispatch to: ${to}`);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    // 🛡️ Force IPv4 and add robust timeouts
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    dnsTimeout: 10000,
    // 🔥 The "Magic" setting for Render: Force IPv4
    socket: {
      family: 4
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    }
  });

  const mailOptions = {
    from: `"SocialBureau" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ [MAILER] Success! Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ [MAILER] IPv4 Dispatch Failed.");
    console.error(`Error Type: ${err.name}`);
    console.error(`Error Message: ${err.message}`);

    if (process.env.NODE_ENV !== "production") {
      console.log("🛠️  [DEV FALLBACK] Proceeding as success for local development.\n");
      return { messageId: "dev-fallback-" + Date.now(), response: "250 OK (Mocked)" };
    }
    
    throw new Error(`Email delivery failed: ${err.message}. This is likely a firewall block by Render.`);
  }
};

module.exports = sendMail;