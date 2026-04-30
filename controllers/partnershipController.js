const Partnership = require("../models/partnershipModel");
const Meeting = require("../models/meetingModel");
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const path = require("path");
const sendMail = require("../utils/sendMail");
const googleService = require("../services/googleService");
const User = require("../models/userModel");

const partnershipController = {
  // Create a new partnership
  createPartner: asyncHandler(async (req, res) => {
    const { name, param, email, category, status, tags, image, subtitle, role, user } = req.body;

    if (!name || !param) {
      res.status(400);
      throw new Error("Name and param are required");
    }

    const exists = await Partnership.findOne({ 
      param: { $regex: new RegExp(`^${param}$`, "i") } 
    });
    if (exists) {
      res.status(400);
      throw new Error("URL param already exists");
    }

    const partner = await Partnership.create({
      name,
      param,
      email,
      category,
      status,
      tags,
      image,
      subtitle,
      role: role || "partnership",
      user: user || undefined,
      updatedBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: "Partner registered successfully",
      data: partner,
    });
  }),

  // Get all partnerships
  getPartners: asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isFree) filter.isFree = req.query.isFree === 'true';

    const partners = await Partnership.find(filter)
      .populate("updatedBy", "name email")
      .sort("-createdAt");

    res.json({
      success: true,
      data: partners,
    });
  }),

  // Get single partnership by param
  getPartnerByParam: asyncHandler(async (req, res) => {
    const partner = await Partnership.findOne({ 
      param: { $regex: new RegExp(`^${req.params.param}$`, "i") } 
    }).populate(
      "updatedBy",
      "name email"
    ).select("+user");

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    res.json({
      success: true,
      data: partner,
    });
  }),

  // Update partnership
  updatePartner: asyncHandler(async (req, res) => {
    const partner = await Partnership.findById(req.params.id);

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    const { name, param, email, category, status, tags, image, subtitle, role, user, details, isFree, templateId } = req.body;
    const logMsg = `[${new Date().toISOString()}] ADMIN_UPDATE: ID=${req.params.id}, Name=${name}, Details=${!!details}\n`;
    fs.appendFileSync("save_debug.log", logMsg);
    console.log(logMsg);

    // Check if param is being changed and if it conflicts
    if (param && param !== partner.param) {
      const exists = await Partnership.findOne({ 
        param: { $regex: new RegExp(`^${param}$`, "i") } 
      });
      if (exists) {
        res.status(400);
        throw new Error("URL param already exists");
      }
    }

    partner.name = name || partner.name;
    partner.param = param || partner.param;
    partner.email = email !== undefined ? email : partner.email;
    partner.category = category || partner.category;
    partner.status = status || partner.status;
    partner.tags = tags || partner.tags;
    partner.image = image || partner.image;
    partner.subtitle = subtitle || partner.subtitle;
    partner.role = role || partner.role;
    partner.details = details || partner.details;
    partner.templateId = templateId || partner.templateId;
    partner.isFree = isFree !== undefined ? isFree : partner.isFree;
    partner.user = user !== undefined ? (user || undefined) : partner.user;
    partner.updatedBy = req.user?.id;

    if (details) {
      partner.markModified('details');
    }

    const updatedPartner = await partner.save();

    res.json({
      success: true,
      message: "Partner updated successfully",
      data: updatedPartner,
    });
  }),

  // Delete partnership
  deletePartner: asyncHandler(async (req, res) => {
    const partner = await Partnership.findById(req.params.id);

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    // Also delete the associated user if it exists
    if (partner.user) {
      await User.findByIdAndDelete(partner.user);
    }

    await Partnership.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Partner and associated user removed successfully",
    });
  }),

  // Schedule Meeting Email
  scheduleMeeting: asyncHandler(async (req, res) => {
    const { userName, userEmail, selectedService, userDate, partnerEmail, partnerName, gmeet } = req.body;

    if (!userName || !userEmail || !partnerEmail) {
      res.status(400);
      throw new Error("Missing required fields for scheduling meeting");
    }

    // 1. Check if person already has a meeting scheduled for this service or date (Duplicate prevention)
    const existingMeeting = await Meeting.findOne({
      userEmail,
      status: "scheduled",
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Check last 24 hours
    });

    if (existingMeeting) {
      return res.status(200).json({
        success: true,
        alreadyScheduled: true,
        message: "You already have a meeting scheduled in the last 24 hours.",
        data: existingMeeting
      });
    }

    // 2. Generate Real Google Meet Link via Google Calendar
    const realGmeetLink = await googleService.createCalendarEvent({
      userName,
      userEmail,
      selectedService,
      userDate,
      partnerName,
      partnerEmail,
      fallbackGmeet: gmeet // fallback to provided link if calendar event fails
    });

    // 3. Save to MongoDB
    const meeting = await Meeting.create({
      userName,
      userEmail,
      selectedService,
      userDate: new Date(userDate),
      partnerName,
      partnerEmail,
      gmeetLink: realGmeetLink
    });

    // 4. Save to Google Sheets (Async - don't block response)
    googleService.appendToSheet({
      userName,
      userEmail,
      selectedService,
      userDate,
      partnerName,
      partnerEmail,
      gmeetLink: realGmeetLink
    });

    const subject = `Confirmed: Meeting Invitation - ${userName} & ${partnerName}`;
    
    // HTML version of the email for a professional look
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #111; color: #fff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Meeting Invitation Confirmed</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">SocialBureau Partnership Team</p>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your meeting with <strong>${partnerName}</strong> has been successfully scheduled. Below are the details:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Service:</td>
                <td style="padding: 8px 0;">${selectedService}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Scheduled Time:</td>
                <td style="padding: 8px 0;">${new Date(userDate).toLocaleString()} (UTC)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Partner:</td>
                <td style="padding: 8px 0;">${partnerName}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${realGmeetLink}" style="background-color: #111; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
              JOIN GOOGLE MEET
            </a>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">Link: ${realGmeetLink}</p>
          </div>

          <p style="font-size: 13px; color: #666; font-style: italic;">
            Note: This meeting has been automatically scheduled. A calendar invitation has also been sent to your email.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
          © ${new Date().getFullYear()} SocialBureau. All rights reserved.
        </div>
      </div>
    `;

    try {
      // Send to partner
      await sendMail({
        to: partnerEmail,
        subject: subject,
        html: html,
      });

      // Send to user
      await sendMail({
        to: userEmail,
        subject: subject,
        html: html,
      });

      // Send to Admin
      await sendMail({
        to: process.env.MAIL_USER,
        subject: `[NEW MEETING] ${userName} - ${selectedService}`,
        html: html,
      });

      res.status(200).json({
        success: true,
        message: "Meeting scheduled and emails sent successfully",
        gmeetLink: realGmeetLink,
        meetingId: meeting._id
      });
    } catch (error) {
      console.error("Error sending schedule email:", error);
      res.status(500);
      throw new Error("Failed to send meeting emails");
    }
  }),
  
  // Upload Image to Cloudinary
  uploadImage: asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("No image file provided");
    }
    
    res.json({
      success: true,
      url: req.file.path, // Cloudinary URL
      message: "Image uploaded successfully"
    });
  }),
  
  // Get logged-in user's partnership
  getMyPartnership: asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const partner = await Partnership.findOne({ user: userId });
    
    if (!partner) {
      // Don't throw error, just return empty data so frontend knows to create
      return res.json({ success: true, data: null });
    }
    
    res.json({
      success: true,
      data: partner
    });
  }),
  
  // Create or Update logged-in user's partnership
  createOrUpdateMyPartnership: asyncHandler(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const { name, param, email, category, status, tags, image, subtitle, details, templateId } = req.body;
      
      if (!name || !param) {
        res.status(400);
        throw new Error("Name and param are required");
      }
      
      let partner = await Partnership.findOne({ user: userId });
      
      // Check if param conflicts with another user's partnership
      const exists = await Partnership.findOne({ 
        param: { $regex: new RegExp(`^${param}$`, "i") },
        user: { $nin: [userId, null, undefined] } // Conflict only if another user already owns it
      });
      
      if (exists) {
        res.status(400);
        throw new Error("URL param already taken by another partner");
      }
      
      // If we find an orphaned partnership with this param, we might want to adopt it
      const orphan = await Partnership.findOne({
        param: { $regex: new RegExp(`^${param}$`, "i") },
        user: { $exists: false }
      });

      const logMsg = `[${new Date().toISOString()}] OWNER_SAVE: User=${userId}, Name=${name}, Details=${!!details}\n`;
      fs.appendFileSync("save_debug.log", logMsg);
      console.log(logMsg);
      
      const updateData = {
        name,
        param,
        email: email || req.user?.email,
        category: category || "student",
        status: status || "active",
        tags: tags || ["student", "portfolio"],
        image,
        subtitle,
        details: details || (partner ? partner.details : {}),
        templateId: templateId || (partner ? partner.templateId : "template1"),
        isFree: req.body.isFree || false,
        role: "partnership",
        user: userId,
        updatedBy: userId
      };
      
      if (partner) {
        // User already has a partnership, update it
        partner = await Partnership.findOneAndUpdate(
          { user: userId },
          updateData,
          { new: true, runValidators: true }
        );
      } else if (orphan) {
        // No partnership for user yet, but an orphaned one exists with this slug. Claim it.
        partner = await Partnership.findByIdAndUpdate(
          orphan._id,
          updateData,
          { new: true, runValidators: true }
        );
      } else {
        // Create new
        partner = await Partnership.create(updateData);
      }
      
      res.status(200).json({
        success: true,
        message: partner ? "Portfolio synchronized successfully" : "Created successfully",
        data: partner
      });
    } catch (error) {
      console.error("CRITICAL PORTFOLIO ERROR:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error during portfolio initialization"
      });
    }
  }),

  // Get student stats for floating notifications
  getStudentStats: asyncHandler(async (req, res) => {
    try {
      const totalCount = await Partnership.countDocuments({ isFree: true });
      
      const recentStudents = await Partnership.find({ isFree: true })
        .select("name image param user")
        .populate("user", "avatar name")
        .sort("-createdAt")
        .limit(15);
        
      res.status(200).json({
        success: true,
        totalCount: totalCount || 0,
        recentStudents: (recentStudents || []).map(s => ({
          id: s._id,
          name: s.name,
          param: s.param,
          image: s.user?.avatar || s.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`
        }))
      });
    } catch (err) {
      console.error("CRITICAL GET STUDENT STATS ERROR:", err);
      res.status(200).json({ 
        success: true, 
        totalCount: 0, 
        recentStudents: [],
        error: err.message 
      });
    }
  }),

  // Get single partnership by ID (Admin)
  getPartnerById: asyncHandler(async (req, res) => {
    const partner = await Partnership.findById(req.params.id).populate(
      "user",
      "name email avatar"
    );

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    res.json({
      success: true,
      data: partner,
    });
  }),
};

module.exports = partnershipController;
