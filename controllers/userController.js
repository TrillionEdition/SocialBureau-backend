const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const asyncHandler = require("express-async-handler")
const User = require("../models/userModel")
const Partnership = require("../models/partnershipModel");
const Tool = require("../models/toolModel")
const Client = require("../models/clientsModel")
const Subscriber = require("../models/Subscriber");
const sendMail = require("../utils/sendMail");
const blogJobTemplate = require("../utils/blogEmailTemplate");
const { getLatestPublishedBlog, getLatestActiveJob } = require("../services/blogService");

const crypto = require("crypto");
const { storeVerificationCode, getVerificationCode, removeVerificationCode } = require("../utils/redis/Advancedcaching");

// helper to get upload URL from multer/cloudinary file object
function getUrlFromFile(f) {
  return f?.path || f?.secure_url || f?.url || f?.location || f?.publicUrl || null;
}
const userController = {

  register: asyncHandler(async (req, res) => {
    const { clickupId, email, name, password, role, emp_id, doj, rate, phone, isEmployee } = req.body;
    console.log(" Register attempt with email:", email);

    if (email) {
      const emailExists = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      console.log("Email check result:", emailExists);

      if (emailExists) {
        res.status(400);
        throw new Error("Email already exists");
      }
    }

    if (clickupId) {
      const userExists = await User.findOne({ clickupId });
      if (userExists) {
        res.status(400);
        throw new Error('User already exists');
      }
    }

    let toolsInput = req.body.tools;
    console.log("Raw tools from req.body:", toolsInput, typeof toolsInput);

    if (typeof toolsInput === 'string') {
      try {
        toolsInput = JSON.parse(toolsInput);
        console.log("Parsed tools:", toolsInput);
      } catch (err) {
        console.error("Failed to parse tools JSON:", err.message);
        toolsInput = [];
      }
    }

    if (!Array.isArray(toolsInput)) {
      toolsInput = toolsInput ? [toolsInput] : [];
    }

    console.log("Final toolsInput after parsing:", toolsInput);

    // Handle Clients Input parsing
    let clientsInput = req.body.clients;
    if (typeof clientsInput === 'string') {
      try {
        clientsInput = JSON.parse(clientsInput);
      } catch (err) {
        clientsInput = [];
      }
    }
    if (!Array.isArray(clientsInput)) {
      clientsInput = clientsInput ? [clientsInput] : [];
    }


    const coverFile = req.files?.coverImage?.[0];
    const idCardFile = req.files?.idCard?.[0];

    const coverImageUrl = getUrlFromFile(coverFile);
    const idCardUrl = getUrlFromFile(idCardFile);

    const normalizeTool = (t) => {
      if (!t || typeof t !== "object") return null;

      const toolName = typeof t.toolName === "string" ? t.toolName.trim() : "";

      if (!toolName) return null;

      return {
        toolName,
        url: t.url ? t.url.trim() : undefined,
        icon: t.icon || undefined,
        description: t.description ? t.description.trim() : undefined,
      };
    };

    const normalized = toolsInput
      .map(normalizeTool)
      .filter(Boolean);

    console.log("Normalized tools:", normalized);

    const seen = new Set();
    const dedupedTools = [];
    for (const t of normalized) {
      const key = t.toolName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        dedupedTools.push(t);
      }
    }

    console.log("Deduped tools:", dedupedTools);
    const toolFiles = req.files?.toolIcons || [];
    console.log("Uploaded tool icon files count:", toolFiles.length);

    for (let i = 0; i < dedupedTools.length; i++) {
      const t = dedupedTools[i];
      if (!t.icon && toolFiles[i]) {
        const iconUrl = getUrlFromFile(toolFiles[i]);
        if (iconUrl) {
          t.icon = iconUrl;
          console.log(`Mapped uploaded icon for tool ${i} (${t.toolName}):`, iconUrl);
        }
      }
    }

    const toolIds = await Promise.all(
      dedupedTools.map(async (t) => {
        const existing = await Tool.findOne({
          toolName: { $regex: `^${escapeRegExp(t.toolName)}$`, $options: 'i' }
        });

        if (existing) {
          console.log(`Tool "${t.toolName}" already exists. Updating if needed...`);
          let changed = false;
          if (t.url && existing.url !== t.url) { existing.url = t.url; changed = true; }
          if (t.icon && existing.icon !== t.icon) { existing.icon = t.icon; changed = true; console.log(`  - Updated icon to: ${t.icon}`); }
          if (t.description && existing.description !== t.description) { existing.description = t.description; changed = true; }
          if (changed) await existing.save();
          return existing._id;
        }

        try {
          console.log(`Creating new tool: ${t.toolName}`, { url: t.url, icon: t.icon, description: t.description });
          const created = await Tool.create({
            toolName: t.toolName,
            url: t.url,
            icon: t.icon,
            description: t.description,
          });
          console.log(`Created tool ${t.toolName} with ID: ${created._id}, icon: ${created.icon}`);
          return created._id;
        } catch (err) {
          if (err.code === 11000) {
            const retry = await Tool.findOne({
              toolName: { $regex: `^${escapeRegExp(t.toolName)}$`, $options: 'i' }
            });
            if (retry) return retry._id;
          }
          throw err;
        }
      })
    );

    console.log("Final toolIds to save:", toolIds);

    // Process Clients
    const clientIds = [];
    for (const clientData of clientsInput) {
      const { name, companyName, email, phone, website, logo, status, notes } = clientData || {};
      if (!name) continue;

      const idQuery = {
        $or: [
          email ? { email } : null,
          website ? { website } : null,
          { name }
        ].filter(Boolean)
      };

      const client = await Client.findOneAndUpdate(
        idQuery,
        {
          $set: {
            name,
            companyName: companyName ?? "",
            email: email ?? "",
            phone: phone ?? "",
            website: website ?? "",
            logo: logo ?? "",
            notes: notes ?? "",
            status: status ?? "active",
          }
        },
        { new: true, upsert: true }
      );
      clientIds.push(client._id);
    }
    const uniqueClientIds = [...new Set(clientIds.map(id => id.toString()))];



    const hashed_password = await bcrypt.hash(password, 10);
    const now = new Date();
    const joinDate = new Date(doj);

    let years = now.getFullYear() - joinDate.getFullYear();
    let months = now.getMonth() - joinDate.getMonth();
    let days = now.getDate() - joinDate.getDate();

    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const exp = `${years}.${months}`;

    const userCreated = await User.create({
      clickupId,
      email,
      rate,
      role,
      isEmployee,
      name,
      emp_id,
      doj,
      password: hashed_password,
      coverImage: coverImageUrl,
      idCard: idCardUrl,
      exp,
      tools: toolIds,
      clients: uniqueClientIds,
    });



    if (!userCreated) {
      res.status(500);
      throw new Error('User creation failed');
    }

    // ✅ AUTO-SUBSCRIBE USER TO NEWSLETTER (NON-BLOCKING)
    try {
      await Subscriber.findOneAndUpdate(
        { email: userCreated.email.toLowerCase().trim() },
        {
          email: userCreated.email.toLowerCase().trim(),
          isActive: true,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    } catch (err) {
      console.error("⚠️ Newsletter subscription failed:", err.message);
    }

    // ✅ SEND WELCOME EMAIL (NON-BLOCKING)
    (async () => {
      try {
        const blog = await getLatestPublishedBlog();
        const job = await getLatestActiveJob();

        if (blog) {
          await sendMail({
            to: userCreated.email,
            subject: `Welcome! Read our latest blog: ${blog.title}`,
            html: blogJobTemplate({ blog, job }),
          });
        }
      } catch (err) {
        console.error("⚠️ Welcome email failed:", err && err.message ? err.message : err);
      }
    })();


    if (!userCreated) {
      res.status(500);
      throw new Error('User creation failed');
    }

    console.log("User created with tools:", userCreated);

    const payload = {
      email: userCreated.email,
      id: userCreated._id || userCreated.id,
      name: userCreated.name,
      role: userCreated.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '2d' });

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      maxAge: 2 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: !!isProd,
      sameSite: isProd ? 'none' : 'lax',
    });

    res.status(201).json({
      message: 'User created successfully',
      user: { 
        id: userCreated._id || userCreated.id, 
        email: userCreated.email, 
        name: userCreated.name,
        role: userCreated.role,
      },
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, clickupId, password } = req.body;

    const userExist = await User.findOne({
      $or: [
        email ? { email: email.toLowerCase().trim() } : null,
        clickupId ? { clickupId } : null,
      ].filter(Boolean),
    });

    if (!userExist) {
      res.status(400);
      throw new Error("User not found");
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

    // 🔐 ROLE & VERIFICATION CHECK - Fixed logic
    const isEmployee = userExist.role === "employee";
    const isVerified = userExist.verification === true; // Boolean comparison only

    const payload = {
      id: userExist._id,
      email: userExist.email,
      role: userExist.role,
      verification: userExist.verification,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      maxAge: 2 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // ✅ SEND FLAGS TO FRONTEND
    res.json({
      message: "Login successful",
      token,
      user: {
        id: userExist._id,
        email: userExist.email,
        role: userExist.role,
        verification: userExist.verification,
        isEmployee,
        isVerified,
      },
    });
  }),

  logout: asyncHandler(async (req, res) => {
    res.clearCookie("token")
    res.send("User logged out")
  }),

  getUsers: asyncHandler(async (req, res) => {
    try {
      const users = await User.find(
        {},
        "name rating exp rate coverImage idCard tools role"
      )
        .populate({
          path: "tools",
          select: "toolName url icon description -_id",
        })
        .lean()
        .exec();

      return res.send(users);
    } catch (err) {
      console.error("getUsers error:", err);
      return res
        .status(500)
        .json({ message: "Internal server error", error: err.message });
    }
  }),

  updateTool: asyncHandler(async (req, res) => {
    try {
      const { userId } = req.body;

      // tools may be sent as JSON string (from form-data) or as an array
      let toolsInput = req.body.tools;
      if (typeof toolsInput === 'string') {
        try {
          toolsInput = JSON.parse(toolsInput);
        } catch (err) {
          // fallback: keep as string -> wrap into array so validation below catches it
          toolsInput = toolsInput ? [toolsInput] : [];
        }
      }

      if (!userId || !toolsInput || !Array.isArray(toolsInput)) {
        return res.status(400).json({
          success: false,
          message: "userId and tools[] are required",
        });
      }

      // files uploaded via multer on this route (if any)
      const toolFiles = req.files?.toolIcons || [];

      const toolIds = [];

      for (let i = 0; i < toolsInput.length; i++) {
        const toolData = toolsInput[i] || {};
        const { toolName } = toolData;
        // url, icon, description optional in payload; icon can come from uploaded file
        const url = toolData.url || "";
        const description = toolData.description || "";

        // map uploaded files by order -> icon from payload takes precedence
        const uploadedFile = toolFiles[i];
        const iconUrl = toolData.icon || getUrlFromFile(uploadedFile) || "";

        if (!toolName) {
          return res.status(400).json({
            success: false,
            message: "toolName is required for each tool",
          });
        }

        // Case-insensitive search for an existing tool (match by name + url if provided)
        const query = { toolName: { $regex: `^${escapeRegExp(toolName)}$`, $options: 'i' } };
        if (url) query.url = url;

        let tool = await Tool.findOne(query);

        if (!tool) {
          tool = await Tool.create({
            toolName,
            url,
            icon: iconUrl,
            description,
          });
        } else if (iconUrl && (!tool.icon || tool.icon !== iconUrl)) {
          // update icon if a new uploaded icon was provided
          tool.icon = iconUrl;
          await tool.save();
        }

        toolIds.push(tool._id);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { tools: toolIds }, // replace current tools
        { new: true }
      ).populate("tools");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Tools saved & assigned successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating tools", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }),

  updateClient: asyncHandler(async (req, res) => {
    try {
      const { userId, clients } = req.body;

      if (!userId || !Array.isArray(clients)) {
        return res.status(400).json({
          success: false,
          message: "userId and clients[] are required",
        });
      }

      const clientIds = [];

      for (const clientData of clients) {
        const { name, companyName, email, phone, website, logo, status, notes } = clientData || {};
        if (!name) {
          return res.status(400).json({
            success: false,
            message: "Client name is required for each client",
          });
        }

        // identify existing client by email OR website OR name (in that order)
        const idQuery = {
          $or: [
            email ? { email } : null,
            website ? { website } : null,
            { name }
          ].filter(Boolean)
        };

        // upsert to avoid duplicates in Client collection and to update provided fields
        const client = await Client.findOneAndUpdate(
          idQuery,
          {
            $set: {
              name,
              companyName: companyName ?? "",
              email: email ?? "",
              phone: phone ?? "",
              website: website ?? "",
              logo: logo ?? "",
              notes: notes ?? "",
              status: status ?? "active",
            }
          },
          { new: true, upsert: true }
        );

        clientIds.push(client._id);
      }

      // dedupe incoming IDs before adding
      const uniqueIds = [...new Set(clientIds.map(String))];

      // append without duplicating existing entries
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { clients: { $each: uniqueIds } } },
        { new: true }
      ).populate("clients");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Clients added (skipping duplicates) and assigned successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating clients", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }),

  getLeaderboard: asyncHandler(async (req, res) => {
    const users = await User.find({ points: { $gt: 0 } })
      .select("name points engagement")
      .sort({ points: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: users,
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    let user;
    try {
      // 1. Try finding by primary User account email
      user = await User.findOne({ email: email.toLowerCase().trim() });

      // 2. If not found, try searching the Partnerships collection
      if (!user) {
        console.log(`[AUTH] Primary email ${email} not found. Searching partnerships...`);
        const partner = await Partnership.findOne({ 
          email: email.toLowerCase().trim() 
        }).populate("user");

        if (partner && partner.user) {
          user = partner.user;
          console.log(`[AUTH] Linked user found via partnership: ${user.email}`);
        } else if (partner) {
           // Orphaned partnership with an email but no user account
           res.status(400);
           throw new Error("Portfolio found, but no associated account. Please register first.");
        }
      }
    } catch (dbError) {
      console.error("Database connection error during OTP request:", dbError.message);
      res.status(503);
      throw new Error("System is currently offline or undergoing maintenance. Please check your internet connection.");
    }

    if (!user) {
      res.status(404);
      throw new Error("Email not found in our security database.");
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis/Memory with 10 minute expiry
    try {
      console.log(`[OTP] Storing code for ${email.toLowerCase().trim()}: ${otp}`);
      await storeVerificationCode(email.toLowerCase().trim(), otp, 600);
    } catch (redisError) {
      console.warn("OTP Storage warning:", redisError.message);
    }

    // Send OTP via email (Always send to the email they provided/requested)
    const targetEmail = email.toLowerCase().trim();
    
    console.log(`[AUTH] Attempting to send OTP to: ${targetEmail}`);

    try {
      await sendMail({
        to: targetEmail,
        subject: "Verification Protocol - SocialBureau Identity",
        html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 40px; background: #000; color: #fff; border: 1px solid #333; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #E8001A; font-weight: 900; letter-spacing: -2px; margin: 0; font-size: 32px; text-transform: uppercase; font-style: italic;">SocialBureau</h1>
            <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; margin-top: 10px;">Security Verification Protocol</p>
          </div>
          
          <p style="font-size: 16px; color: #ccc; line-height: 1.6;">A request was made to authorize a password reset for your account. Please use the following temporary access code:</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: #111; padding: 30px 50px; border-radius: 16px; border: 1px solid #E8001A; box-shadow: 0 10px 30px rgba(232, 0, 26, 0.1);">
              <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #fff; font-family: monospace;">${otp}</span>
            </div>
          </div>
          
          <p style="font-size: 13px; color: #444; text-align: center;">This code will expire in 10 minutes. If you did not initiate this sequence, please secure your account immediately.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #222; text-align: center;">
            <p style="font-size: 9px; color: #333; text-transform: uppercase; letter-spacing: 2px;">© 2024 SocialBureau // Identity Systems</p>
          </div>
        </div>
      `,
      });
      console.log(`[AUTH] OTP successfully sent to ${targetEmail}`);
    } catch (mailError) {
      console.error(`[AUTH] Failed to send OTP to ${targetEmail}:`, mailError.message);
      res.status(500);
      throw new Error(`Email delivery failed: ${mailError.message}. Please try again later or contact support.`);
    }

    res.json({ success: true, message: "Verification code dispatched successfully." });
  }),

  verifyResetOTP: asyncHandler(async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400);
        throw new Error("Email and OTP are required");
      }

      const normalizedEmail = email.toLowerCase().trim();
      const storedOtp = await getVerificationCode(normalizedEmail);

      console.log(`[OTP] Verifying for ${normalizedEmail}. Provided: ${otp}, Stored: ${storedOtp}`);

      if (!storedOtp || storedOtp !== otp) {
        console.log(`[OTP] Mismatch or expired for ${normalizedEmail}`);
        res.status(400);
        throw new Error("Invalid or expired OTP");
      }

      // Remove OTP after verification
      await removeVerificationCode(normalizedEmail);
      
      // Find the actual user primary email to put in the token
      // This ensures resetPassword (which looks by email) finds the right account
      let accountEmail = normalizedEmail;
      const primaryUser = await User.findOne({ email: normalizedEmail });
      
      if (!primaryUser) {
        // If not a primary email, check if it's a partnership email
        const partner = await Partnership.findOne({ email: normalizedEmail }).populate("user");
        if (partner && partner.user) {
          accountEmail = partner.user.email;
          console.log(`[AUTH] Mapping partnership email ${normalizedEmail} to account email ${accountEmail}`);
        }
      }

      // Generate a temporary signed token for password reset (valid for 5 minutes)
      const resetToken = jwt.sign(
        { email: accountEmail, type: "password_reset" },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "5m" }
      );

      res.json({
        success: true,
        message: "OTP verified successfully",
        resetToken,
      });
    } catch (error) {
      console.error("[OTP ERROR] Verification failed:", error.message, error.stack);
      if (res.statusCode === 200) res.status(500);
      throw error;
    }
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400);
      throw new Error("Token and password are required");
    }

    try {
      // Verify the temporary reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      if (decoded.type !== "password_reset") {
        throw new Error("Invalid token type");
      }

      const user = await User.findOne({ email: decoded.email });

      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }

      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
      
      // Clear any old link-based tokens if they exist
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.json({ success: true, message: "Password reset successful" });
    } catch (err) {
      res.status(400);
      throw new Error("Invalid or expired reset token. Please start over.");
    }
  }),

  getUserById: asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .populate("tools clients achievements reviews")
      .lean();
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  }),

  updateUser: asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.phone = req.body.phone || user.phone;
      user.rate = req.body.rate || user.rate;
      user.exp = req.body.exp || user.exp;
      user.doj = req.body.doj || user.doj;
      user.emp_id = req.body.emp_id || user.emp_id;
      // user.clickupId = req.body.clickupId || user.clickupId;

      // if (req.body.isEmployee !== undefined) {
      //   user.isEmployee = req.body.isEmployee;
      // }

      // Handle Tools Update
      if (req.body.tools) {
        let toolsInput = req.body.tools;
        if (typeof toolsInput === 'string') {
          try {
            toolsInput = JSON.parse(toolsInput);
          } catch (err) {
            toolsInput = [];
          }
        }
        if (!Array.isArray(toolsInput)) toolsInput = toolsInput ? [toolsInput] : [];

        const normalizeTool = (t) => {
          if (!t || typeof t !== "object") return null;
          const toolName = typeof t.toolName === "string" ? t.toolName.trim() : "";
          if (!toolName) return null;
          return {
            toolName,
            url: t.url ? t.url.trim() : undefined,
            icon: t.icon || undefined,
            description: t.description ? t.description.trim() : undefined,
          };
        };

        const normalized = toolsInput.map(normalizeTool).filter(Boolean);
        const seen = new Set();
        const dedupedTools = [];
        for (const t of normalized) {
          const key = t.toolName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            dedupedTools.push(t);
          }
        }

        const toolFiles = req.files?.toolIcons || [];
        for (let i = 0; i < dedupedTools.length; i++) {
          const t = dedupedTools[i];
          if (!t.icon && toolFiles[i]) {
            const iconUrl = getUrlFromFile(toolFiles[i]);
            if (iconUrl) t.icon = iconUrl;
          }
        }

        const toolIds = await Promise.all(dedupedTools.map(async (t) => {
          const existing = await Tool.findOne({
            toolName: { $regex: `^${escapeRegExp(t.toolName)}$`, $options: 'i' }
          });
          if (existing) {
            let changed = false;
            if (t.url && existing.url !== t.url) { existing.url = t.url; changed = true; }
            if (t.icon && existing.icon !== t.icon) { existing.icon = t.icon; changed = true; }
            if (t.description && existing.description !== t.description) { existing.description = t.description; changed = true; }
            if (changed) await existing.save();
            return existing._id;
          }
          try {
            const created = await Tool.create(t);
            return created._id;
          } catch (err) {
            if (err.code === 11000) {
              const retry = await Tool.findOne({ toolName: { $regex: `^${escapeRegExp(t.toolName)}$`, $options: 'i' } });
              if (retry) return retry._id;
            }
            throw err;
          }
        }));

        user.tools = toolIds;
      }
      //new
      // Handle Clients Update
      if (req.body.clients) {
        let clientsInput = req.body.clients;
        if (typeof clientsInput === 'string') {
          try {
            clientsInput = JSON.parse(clientsInput);
          } catch (err) {
            clientsInput = [];
          }
        }
        if (!Array.isArray(clientsInput)) clientsInput = clientsInput ? [clientsInput] : [];

        const clientIds = [];
        for (const clientData of clientsInput) {
          const { name, companyName, email, phone, website, logo, status, notes } = clientData || {};
          if (!name) continue;

          const idQuery = {
            $or: [
              email ? { email } : null,
              website ? { website } : null,
              { name }
            ].filter(Boolean)
          };

          const client = await Client.findOneAndUpdate(
            idQuery,
            {
              $set: {
                name,
                companyName: companyName ?? "",
                email: email ?? "",
                phone: phone ?? "",
                website: website ?? "",
                logo: logo ?? "",
                notes: notes ?? "",
                status: status ?? "active",
              }
            },
            { new: true, upsert: true }
          );
          clientIds.push(client._id);
        }
        user.clients = [...new Set(clientIds.map(id => id.toString()))];
      }



      // Handle file uploads
      const coverFile = req.files?.coverImage?.[0];
      const idCardFile = req.files?.idCard?.[0];
      const avatarFile = req.files?.avatar?.[0]; // New

      if (coverFile) {
        user.coverImage = getUrlFromFile(coverFile);
      }
      if (idCardFile) {
        user.idCard = getUrlFromFile(idCardFile);
      }
      if (avatarFile) {
        user.avatar = getUrlFromFile(avatarFile);
      }

      if (req.body.password) {
        user.password = await bcrypt.hash(req.body.password, 10);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isEmployee: updatedUser.isEmployee,
        // Return new fields
        title: updatedUser.title,
        bio: updatedUser.bio,
        location: updatedUser.location,
        avatar: updatedUser.avatar,
        coverImage: updatedUser.coverImage,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  }),

  updateClient: asyncHandler(async (req, res) => {
    try {
      const { userId, clients } = req.body;

      if (!userId || !Array.isArray(clients)) {
        return res.status(400).json({
          success: false,
          message: "userId and clients[] are required",
        });
      }

      const clientIds = [];

      for (const clientData of clients) {
        const { name, companyName, email, phone, website, logo, status, notes } = clientData || {};
        if (!name) {
          return res.status(400).json({
            success: false,
            message: "Client name is required for each client",
          });
        }

        const idQuery = {
          $or: [
            email ? { email } : null,
            website ? { website } : null,
            { name }
          ].filter(Boolean)
        };

        const client = await Client.findOneAndUpdate(
          idQuery,
          {
            $set: {
              name,
              companyName: companyName ?? "",
              email: email ?? "",
              phone: phone ?? "",
              website: website ?? "",
              logo: logo ?? "",
              notes: notes ?? "",
              status: status ?? "active",
            }
          },
          { new: true, upsert: true }
        );

        clientIds.push(client._id);
      }

      const uniqueIds = [...new Set(clientIds.map(String))];

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { clients: { $each: uniqueIds } } },
        { new: true }
      ).populate("clients");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Clients updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating clients", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }),


};

module.exports = userController;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
