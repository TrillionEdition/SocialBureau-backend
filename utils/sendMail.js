const nodemailer = require("nodemailer");
const dns = require("dns");

// Force IPv4 DNS resolution globally — fixes Render's IPv6-default timeout with Gmail SMTP
dns.setDefaultResultOrder("ipv4first");

/**
 * GMAIL CLOUD-OPTIMIZED MAILER (IPv4 Force)
 * Uses dns.setDefaultResultOrder("ipv4first") to bypass Render's IPv6 timeout issues.
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
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
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