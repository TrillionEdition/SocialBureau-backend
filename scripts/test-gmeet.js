require("dotenv").config();
const googleService = require("../services/googleService");
const sendMail = require("../utils/sendMail");

async function sendTestMeeting() {
  const testEmail = process.argv[2] || "admin@socialbureau.in";
  console.log(`🚀 Sending test GMeet link to: ${testEmail}`);

  const testData = {
    userName: "Test User",
    userEmail: testEmail,
    selectedService: "GMeet Trial",
    userDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    partnerName: "SocialBureau Support",
    partnerEmail: "partnerships@socialbureau.com",
  };

  try {
    console.log("⏳ Generating Google Meet link...");
    const gmeetLink = await googleService.createCalendarEvent(testData);
    console.log(`✅ Link generated: ${gmeetLink}`);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #111;">Trial Google Meet Invitation</h2>
        <p>This is a test meeting link generated as requested.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${gmeetLink}" style="background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            JOIN TEST MEET
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">Link: ${gmeetLink}</p>
      </div>
    `;

    await sendMail({
      to: testEmail,
      subject: "SocialBureau - Trial GMeet Link",
      html: html,
    });

    console.log("📧 Email sent successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

sendTestMeeting();
