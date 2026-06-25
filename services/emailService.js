// services/emailService.js
const { transporter } = require('../utils/sendMail');

// Verify connection configuration (Optional, already handled in utils/sendMail.js)
// transporter.verify((error, success) => {
//   if (error) {
//     console.error('SMTP Connection Error:', error);
//   } else {
//     console.log('Strategy Lab Mail Server is ready to transmit dossiers.');
//   }
// });


exports.sendConfirmation = async (client) => {
  await transporter.sendMail({
    from: `"SocialBureau" <${process.env.MAIL_USER}>`,
    to: client.email,
    subject: 'We received your request!',
    html: `<h2>Hi ${client.first_name}</h2>
           <p>We will contact you soon.</p>`
  });
};

exports.sendAjnoraConfirmation = async (data) => {
  const { contactName, contactEmail, brandName, legalName } = data;
  const companyName = brandName || legalName || 'your company';

  console.log(`Attempting to transmit dossier confirmation to: ${contactEmail}`);

  await transporter.sendMail({
    from: `"SocialBureau Strategy Lab" <${process.env.MAIL_USER}>`,
    to: contactEmail,
    subject: `Submission Received – We’ll Be in Touch`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://pub-dbc24446d37a40aeb1dfdd10992cd2d9.r2.dev/SB_sticker-02_1_k3ulwd.png" 
          alt="SocialBureau Logo" 
          width="150" 
          style="display: block; margin: 0 auto; width: 150px; height: auto; border: 0;" />
          <div style="height: 2px; width: 50px; background-color: #e8242a; margin: 20px auto;"></div>
        </div>
        
        <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
          Hi <strong>${contactName}</strong>,
        </p>

        <p style="color: #ffffff; line-height: 1.6; font-size: 18px; font-weight: bold; margin: 20px 0;">
          Thank you for choosing Social Bureau.
        </p>
        
        <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
          We’ve received your submission for <strong>${companyName}</strong>, and it has been successfully verified by our <strong>Strategy Lab</strong>.
        </p>
        
        <div style="background-color: #111; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #e8242a;">
          <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Status</p>
          <p style="margin: 5px 0 15px 0; font-size: 18px; color: #4ade80; font-weight: bold;">Verified & Queued</p>
          
          <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Priority</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; color: #ffffff; font-weight: bold;">High</p>
        </div>
        
        <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
          Our team is currently reviewing your requirements. A consultant will reach out within the next 48 hours with initial insights and next steps.
        </p>

        <p style="color: #cccccc; line-height: 1.6; font-size: 16px; margin-top: 20px;">
          If you’d like to add anything, feel free to reply to this email.
        </p>

        <p style="color: #ffffff; line-height: 1.6; font-size: 16px; margin-top: 30px;">
          Warm regards,
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; 2026 SocialBureau (TrillionEdition LLP)</p>
          <p>Kerala's Data-Driven API Marketing Agency</p>
        </div>
      </div>
    `
  });
};

/**
 * Send "Thank You for Logging In" email
 * Triggered after successful user login
 * 
 * @param {Object} userData - User data object
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {Date} loginTime - Timestamp of login
 */
exports.sendLoginThankYouEmail = async (userData) => {
  const { name, email } = userData;
  const loginTime = new Date();
  
  // Format the login date and time in a readable format
  const formattedDateTime = loginTime.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const userFirstName = name ? name.split(' ')[0] : 'User';

  console.log(`📧 [LOGIN EMAIL] Sending login thank you email to: ${email}`);

  try {
    await transporter.sendMail({
      from: `"SocialBureau" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Thank You for Logging In',
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://pub-dbc24446d37a40aeb1dfdd10992cd2d9.r2.dev/SB_sticker-02_1_k3ulwd.png" 
            alt="SocialBureau Logo" 
            width="150" 
            style="display: block; margin: 0 auto; width: 150px; height: auto; border: 0;" />
            <div style="height: 2px; width: 50px; background-color: #e8242a; margin: 20px auto;"></div>
          </div>
          
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
            Hi <strong>${userFirstName}</strong>,
          </p>

          <p style="color: #ffffff; line-height: 1.6; font-size: 18px; font-weight: bold; margin: 20px 0;">
            Thank you for logging in to SocialBureau!
          </p>
          
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
            We're glad to see you back. Your account is secure and active.
          </p>
          
          <div style="background-color: #111; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #e8242a;">
            <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Login Details</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #cccccc;">
              <strong>Date & Time:</strong> ${formattedDateTime} (IST)
            </p>
          </div>

          <div style="background-color: #1a1a1a; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4ade80;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px;">🔒 Security Notice</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #cccccc; line-height: 1.6;">
              If you did not perform this login, please <strong><a href="#" style="color: #e8242a; text-decoration: none;">contact our support team</a></strong> immediately or <strong><a href="#" style="color: #e8242a; text-decoration: none;">change your password</a></strong> to secure your account.
            </p>
          </div>
          
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
            If you have any questions or need assistance, feel free to reach out to our support team.
          </p>

          <p style="color: #ffffff; line-height: 1.6; font-size: 16px; margin-top: 30px;">
            Best regards,<br>
            <strong>SocialBureau Team</strong>
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center; font-size: 12px; color: #666;">
            <p>&copy; 2026 SocialBureau (TrillionEdition LLP)</p>
            <p>Kerala's Data-Driven API Marketing Agency</p>
          </div>
        </div>
      `
    });
    console.log(`✅ [LOGIN EMAIL] Successfully sent to: ${email}`);
  } catch (err) {
    console.error(`❌ [LOGIN EMAIL] Failed to send to: ${email}`);
    console.error(`Error: ${err.message}`);
    // Don't throw - allow login to succeed even if email fails
    // This ensures email service failures don't block user login
  }
};
