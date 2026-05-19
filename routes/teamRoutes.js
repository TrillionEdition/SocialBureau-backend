const express = require("express");
const router = express.Router();
console.log("TEAM ROUTES FILE LOADED SUCCESSFULLY");
const userAuthentication = require("../middlewares/userAuthentication");
const TeamMember = require("../models/teamMemberModel");
const User = require("../models/userModel");
const Tool = require("../models/toolModel");
const Client = require("../models/clientsModel");
const bcrypt = require("bcrypt");

router.get("/test-active", (req, res) => {
  res.send("Team Router is Active and Working!");
});

// --- ADMIN ENDPOINTS (Admin Dashboard) ---

/**
 * GET /team/admin/members
 * Returns all team members for admin management.
 */
router.get("/admin/members", userAuthentication, require("../middlewares/isAdmin"), async (req, res) => {
  try {
    const members = await TeamMember.find().populate({
      path: "user",
      select: "email name role isEmployee emp_id clickupId phone doj rate tools clients achievements coverImage idCard",
      populate: [
        { path: 'tools', select: 'toolName icon url description' },
        { path: 'clients', select: 'name companyName email website logo status notes' },
        { path: 'achievements', select: 'title description image' }
      ]
    });
    res.status(200).json({
      success: true,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /team/admin/member/:id
 * Update any team member profile (Admin only).
 */
router.put("/admin/member/:id", userAuthentication, require("../middlewares/isAdmin"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const TeamMember = require("../models/teamMemberModel");
    const User = require("../models/userModel");
    const Tool = require("../models/toolModel");
    const Client = require("../models/clientsModel");
    const bcrypt = require("bcrypt");

    const profile = await TeamMember.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const {
      email, password, emp_id, phone, doj, rate, clickupId, isEmployee, tools, clients, achievements, coverImage, idCard,
      slug,
      ...teamMemberData
    } = updateData;

    if (slug !== undefined) {
      let slugCandidate = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!slugCandidate) {
        slugCandidate = (teamMemberData.name || profile.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      
      let finalSlug = slugCandidate;
      let counter = 1;
      while (await TeamMember.findOne({ slug: finalSlug, _id: { $ne: id } })) {
        finalSlug = `${slugCandidate}-${counter}`;
        counter++;
      }
      teamMemberData.slug = finalSlug;
    }

    if (profile.user) {
      const userUpdate = {};
      if (email !== undefined) userUpdate.email = email;
      if (password && password.trim() !== '') {
        userUpdate.password = await bcrypt.hash(password, 10);
      }
      if (emp_id !== undefined) userUpdate.emp_id = emp_id;
      if (phone !== undefined) userUpdate.phone = phone;
      if (doj !== undefined) userUpdate.doj = doj ? new Date(doj) : null;
      if (rate !== undefined) userUpdate.rate = rate;
      if (clickupId !== undefined) userUpdate.clickupId = clickupId;
      if (isEmployee !== undefined) userUpdate.isEmployee = isEmployee;
      if (coverImage !== undefined) userUpdate.coverImage = coverImage;
      if (idCard !== undefined) userUpdate.idCard = idCard;

      if (tools !== undefined) {
        let toolIds = [];
        let parsedTools = tools;
        if (typeof tools === 'string') {
          try { parsedTools = JSON.parse(tools); } catch (e) { parsedTools = []; }
        }
        if (parsedTools && Array.isArray(parsedTools)) {
          for (const tool of parsedTools) {
            const { toolName, url, icon, description } = tool || {};
            if (!toolName) continue;
            const updatedTool = await Tool.findOneAndUpdate(
              { toolName },
              { $set: { url: url || "", icon: icon || "", description: description || "" } },
              { new: true, upsert: true }
            );
            toolIds.push(updatedTool._id);
          }
        }
        userUpdate.tools = [...new Set(toolIds.map(id => id.toString()))];
      }

      if (clients !== undefined) {
        let clientIds = [];
        let parsedClients = clients;
        if (typeof clients === 'string') {
          try { parsedClients = JSON.parse(clients); } catch (e) { parsedClients = []; }
        }
        if (parsedClients && Array.isArray(parsedClients)) {
          for (const clientData of parsedClients) {
            const { name: cName, companyName, email: cEmail, phone: cPhone, website, logo, status, notes } = clientData || {};
            if (!cName) continue;
            const idQuery = {
              $or: [
                cEmail ? { email: cEmail } : null,
                website ? { website } : null,
                { name: cName }
              ].filter(Boolean)
            };
            const client = await Client.findOneAndUpdate(
              idQuery,
              { $set: { name: cName, companyName: companyName || "", email: cEmail || "", phone: cPhone || "", website: website || "", logo: logo || "", notes: notes || "", status: status || "active" } },
              { new: true, upsert: true }
            );
            clientIds.push(client._id);
          }
        }
        userUpdate.clients = [...new Set(clientIds.map(id => id.toString()))];
      }

      if (achievements !== undefined) {
        const Achievement = require("../models/achievementModel");
        let achievementIds = [];
        let parsedAchievements = achievements;
        if (typeof achievements === 'string') {
          try { parsedAchievements = JSON.parse(achievements); } catch (e) { parsedAchievements = []; }
        }
        if (parsedAchievements && Array.isArray(parsedAchievements)) {
          await Achievement.deleteMany({ user: profile.user });
          for (const ach of parsedAchievements) {
            const { title, description, image } = ach || {};
            if (!title) continue;
            const createdAch = await Achievement.create({
              user: profile.user,
              title: title.trim(),
              description: description || "",
              image: image || ""
            });
            achievementIds.push(createdAch._id);
          }
        }
        userUpdate.achievements = achievementIds;
      }

      await User.findByIdAndUpdate(profile.user, { $set: userUpdate }, { new: true, runValidators: true });
    }

    const updatedProfile = await TeamMember.findByIdAndUpdate(
      id,
      teamMemberData,
      { new: true, runValidators: true }
    ).populate({
      path: "user",
      select: "email name role isEmployee emp_id clickupId phone doj rate tools clients achievements coverImage idCard",
      populate: [
        { path: 'tools', select: 'toolName icon url description' },
        { path: 'clients', select: 'name companyName email website logo status notes' },
        { path: 'achievements', select: 'title description image' }
      ]
    });

    res.status(200).json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /team-v2/admin/member/:id
 * Delete employee profile and their associated User account.
 * Admin only.
 */
router.delete("/admin/member/:id", userAuthentication, require("../middlewares/isAdmin"), async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await TeamMember.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Employee profile not found." });
    }

    // If there is an associated user, delete it too
    if (profile.user) {
      await User.findByIdAndDelete(profile.user);
    }

    // Delete the TeamMember profile
    await TeamMember.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Employee and associated User account deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/**
 * POST /team/admin/member
 * Create a new employee (both User and TeamMember records).
 * Admin only.
 */
router.post("/admin/member", userAuthentication, require("../middlewares/isAdmin"), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      emp_id,
      phone,
      doj,
      role,
      bgText,
      description,
      image,
      cardImage,
      image1,
      tags,
      category,
      bgColor,
      hasBakedText,
      socials,
      isPublic,
      // NEW FIELDS
      clickupId,
      rate,
      isEmployee,
      coverImage,
      idCard,
      tools,
      clients,
      achievements,
      slug
    } = req.body;

    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 1. Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Name, email, password, and role are required." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email already exists." });
    }

    // 2. Parse and Create Tools
    let toolIds = [];
    let parsedTools = tools;
    if (typeof tools === 'string') {
      try { parsedTools = JSON.parse(tools); } catch (e) { parsedTools = []; }
    }
    if (parsedTools && Array.isArray(parsedTools)) {
      toolIds = await Promise.all(
        parsedTools.map(async (t) => {
          if (!t || !t.toolName) return null;
          const toolName = t.toolName.trim();
          const existing = await Tool.findOne({
            toolName: { $regex: `^${escapeRegExp(toolName)}$`, $options: 'i' }
          });
          if (existing) {
            let changed = false;
            if (t.url && existing.url !== t.url) { existing.url = t.url; changed = true; }
            if (t.icon && existing.icon !== t.icon) { existing.icon = t.icon; changed = true; }
            if (t.description && existing.description !== t.description) { existing.description = t.description; changed = true; }
            if (changed) await existing.save();
            return existing._id;
          }
          const created = await Tool.create({
            toolName,
            url: t.url,
            icon: t.icon,
            description: t.description,
          });
          return created._id;
        })
      );
      toolIds = toolIds.filter(Boolean);
    }

    // 3. Parse and Create Clients
    let clientIds = [];
    let parsedClients = clients;
    if (typeof clients === 'string') {
      try { parsedClients = JSON.parse(clients); } catch (e) { parsedClients = []; }
    }
    if (parsedClients && Array.isArray(parsedClients)) {
      for (const clientData of parsedClients) {
        const { name: cName, companyName, email: cEmail, phone: cPhone, website, logo, status, notes } = clientData || {};
        if (!cName) continue;

        const idQuery = {
          $or: [
            cEmail ? { email: cEmail } : null,
            website ? { website } : null,
            { name: cName }
          ].filter(Boolean)
        };

        const client = await Client.findOneAndUpdate(
          idQuery,
          {
            $set: {
              name: cName,
              companyName: companyName ?? "",
              email: cEmail ?? "",
              phone: cPhone ?? "",
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
    }
    const uniqueClientIds = [...new Set(clientIds.map(id => id.toString()))];

    // 3.5 Parse and Create Achievements
    let achievementIds = [];
    let parsedAchievements = achievements;
    if (typeof achievements === 'string') {
      try { parsedAchievements = JSON.parse(achievements); } catch (e) { parsedAchievements = []; }
    }
    if (parsedAchievements && Array.isArray(parsedAchievements)) {
      const Achievement = require("../models/achievementModel");
      achievementIds = await Promise.all(
        parsedAchievements.map(async (ach) => {
          if (!ach || !ach.title) return null;
          const created = await Achievement.create({
            user: new mongoose.Types.ObjectId(), // placeholder, updated next
            title: ach.title.trim(),
            description: ach.description || "",
            image: ach.image || "",
          });
          return created;
        })
      );
    }
    const cleanAchievementIds = achievementIds.filter(Boolean);

    // 4. Create User record
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      emp_id: emp_id || undefined,
      phone: phone || undefined,
      doj: doj ? new Date(doj) : undefined,
      role,
      isEmployee: isEmployee !== undefined ? isEmployee : true,
      clickupId: clickupId ? String(clickupId).trim() : undefined,
      rate: rate ? Number(rate) : undefined,
      coverImage: coverImage || undefined,
      idCard: idCard || undefined,
      tools: toolIds,
      clients: uniqueClientIds,
      achievements: cleanAchievementIds.map(a => a._id)
    });

    // Update user reference in achievements
    if (cleanAchievementIds.length > 0) {
      const Achievement = require("../models/achievementModel");
      await Achievement.updateMany(
        { _id: { $in: cleanAchievementIds.map(a => a._id) } },
        { $set: { user: newUser._id } }
      );
    }

    // 5. Generate unique slug
    let baseSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = "member";
    let finalSlug = baseSlug;
    let counter = 1;
    while (await TeamMember.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 6. Create TeamMember record
    const newTeamMember = await TeamMember.create({
      user: newUser._id,
      name,
      role,
      bgText: bgText || "",
      description: description || "",
      image: image || "",
      cardImage: cardImage || "",
      image1: image1 || "",
      tags: tags || [],
      category: category || [],
      bgColor: bgColor || "#ff3358",
      hasBakedText: hasBakedText !== undefined ? hasBakedText : true,
      socials: socials || { linkedin: "", instagram: "", twitter: "" },
      isPublic: isPublic !== undefined ? isPublic : false,
      slug: finalSlug
    });

    res.status(201).json({
      success: true,
      message: "Employee and TeamMember profile created successfully.",
      data: {
        user: newUser,
        teamMember: newTeamMember
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// --- PUBLIC ENDPOINTS ---

/**
 * GET /team
 * Returns all team members from the database.
 */
router.get("/", async (req, res) => {
  try {
    const members = await TeamMember.find({ isPublic: true }).sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// --- PRIVATE ENDPOINTS (Team Dashboard) ---

/**
 * GET /team/me
 * Get the authenticated employee's team profile.
 */
router.get("/me", userAuthentication, async (req, res) => {
  try {
    const profile = await TeamMember.findOne({ user: req.user.id });
    
    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          name: req.user.name,
          role: req.user.role || "",
          isNew: true
        }
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /team/me
 * Update or create the authenticated employee's team profile.
 */
router.put("/me", userAuthentication, async (req, res) => {
  try {
    console.log("Team Profile Update Body:", req.body);
    const {
      name,
      role,
      bgText,
      description,
      image,
      cardImage,
      image1,
      tags,
      category,
      bgColor,
      hasBakedText,
      socials,
      isPublic
    } = req.body;

    let profile = await TeamMember.findOne({ user: req.user.id });

    const profileData = {
      user: req.user.id,
      name,
      role,
      bgText,
      description,
      image,
      cardImage,
      image1,
      tags,
      category,
      bgColor,
      hasBakedText,
      socials,
      isPublic
    };

    if (profile) {
      profile = await TeamMember.findOneAndUpdate(
        { user: req.user.id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      profile = await TeamMember.create(profileData);
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /team/upload
 * Upload an image to Cloudflare R2 (images/Team folder)
 */
router.post("/upload", userAuthentication, (req, res, next) => {
  req.uploadFolder = "images/Team";
  next();
}, require("../middlewares/cloudflare").single("image"), (req, res) => {
  try {
    if (!req.file || !req.file.location) {
      return res.status(400).json({ success: false, message: "Upload failed" });
    }
    res.status(200).json({
      success: true,
      url: req.file.location
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /team/member/slug/:slug
 * Get a single team member by slug
 */
router.get("/member/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const member = await TeamMember.findOne({ slug }).populate({
      path: "user",
      select: "email name role isEmployee emp_id clickupId phone doj rate tools clients coverImage idCard",
      populate: [
        { path: 'tools', select: 'toolName icon url description' },
        { path: 'clients', select: 'name companyName email website logo status notes' }
      ]
    });
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
