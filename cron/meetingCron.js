const cron = require("node-cron");
const Meeting = require("../models/meetingModel");
const sendMail = require("../utils/sendMail");

// Run every 10 minutes to check for upcoming meetings
cron.schedule("*/10 * * * *", async () => {
  console.log("🕒 Running Meeting Reminder Cron...");
  
  try {
    const now = new Date();
    const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);
    
    // Find meetings starting in the next 35 minutes that haven't had the link sent
    const upcomingMeetings = await Meeting.find({
      userDate: { $lte: thirtyFiveMinutesFromNow, $gt: now },
      linkSent: false,
      status: "scheduled"
    });

    console.log(`🔍 Found ${upcomingMeetings.length} upcoming meetings to send links for.`);

    for (const meeting of upcomingMeetings) {
      const subject = `URGENT: Your Meeting Link - ${meeting.userName} & ${meeting.partnerName}`;
      
      const html = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #111; color: #fff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px;">Your Meeting is Starting Soon</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">SocialBureau Partnership Team</p>
          </div>
          <div style="padding: 30px; color: #333; line-height: 1.6;">
            <p>Hello <strong>${meeting.userName}</strong>,</p>
            <p>Your meeting with <strong>${meeting.partnerName}</strong> is starting in about 30 minutes. Here is your Google Meet link:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meeting.gmeetLink}" style="background-color: #111; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                JOIN GOOGLE MEET NOW
              </a>
              <p style="margin-top: 10px; font-size: 12px; color: #666;">Link: ${meeting.gmeetLink}</p>
            </div>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">Meeting Details:</p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li><strong>Service:</strong> ${meeting.selectedService}</li>
                <li><strong>Time:</strong> ${new Date(meeting.userDate).toLocaleString()}</li>
              </ul>
            </div>
            
            <p style="font-size: 13px; color: #666;">
              Please ensure you have a stable internet connection and your camera/microphone are working.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
            © ${new Date().getFullYear()} SocialBureau. All rights reserved.
          </div>
        </div>
      `;

      try {
        // Send to user
        await sendMail({
          to: meeting.userEmail,
          subject: subject,
          html: html,
        });

        // Send to partner
        await sendMail({
          to: meeting.partnerEmail,
          subject: subject,
          html: html,
        });

        // Mark as sent
        meeting.linkSent = true;
        await meeting.save();
        
        console.log(`✅ Link sent for meeting: ${meeting._id}`);
      } catch (error) {
        console.error(`❌ Failed to send link for meeting ${meeting._id}:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Meeting Cron Error:", error);
  }
});
