const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    const TeamMember = require('../models/teamMemberModel');
    const User = require('../models/userModel');
    
    const members = await TeamMember.find({}).populate('user');
    if (members.length === 0) {
      console.error("No team members found!");
      mongoose.disconnect();
      return;
    }
    
    const member = members[0];
    if (!member.user) {
      console.error("No user associated!");
      mongoose.disconnect();
      return;
    }
    
    console.log("\n=======================================================");
    console.log("SIMULATING ADMIN UPDATE OF MEMBER:", member.name);
    console.log("=======================================================");
    
    // Simulate req.body sent by AdminTeamDashboard on workShowcase save:
    const mockReqBody = {
      _id: member._id.toString(),
      name: member.name,
      role: member.role,
      bgText: member.bgText || "",
      description: member.description || "",
      image: member.image || "",
      cardImage: member.cardImage || "",
      image1: member.image1 || "",
      tags: member.tags || [],
      category: member.category || [],
      bgColor: member.bgColor || "#ff3358",
      hasBakedText: member.hasBakedText !== undefined ? member.hasBakedText : true,
      socials: member.socials || { linkedin: "", instagram: "", twitter: "" },
      isPublic: member.isPublic || false,
      
      // User fields at the root level of the payload (flat payload):
      email: member.user.email || "",
      emp_id: member.user.emp_id || "",
      phone: member.user.phone || "",
      clickupId: member.user.clickupId || "",
      rate: member.user.rate || "",
      doj: member.user.doj ? member.user.doj.toISOString().split('T')[0] : "",
      isEmployee: member.user.isEmployee !== undefined ? member.user.isEmployee : true,
      coverImage: member.user.coverImage || "",
      idCard: member.user.idCard || "",
      tools: member.user.tools || [],
      clients: member.user.clients || [],
      achievements: member.user.achievements || [],
      hobbies: member.user.hobbies || [],
      podcasts: member.user.podcasts || [],
      events: member.user.events || [],
      innovations: member.user.innovations || [],
      workShowcase: [
        {
          category: "ADMIN DYNAMIC TEST",
          title: "Admin Test Title",
          description: "Admin test description details here.",
          images: ["https://example.com/admin.jpg"],
          link: "https://admin.com"
        }
      ]
    };
    
    console.log("Mock Payload workShowcase:", JSON.stringify(mockReqBody.workShowcase, null, 2));
    
    // ----------------------------------------------------
    // SIMULATED BACKEND CODE (from PUT /admin/member/:id)
    // ----------------------------------------------------
    const {
      email, password, emp_id, phone, doj, rate, clickupId, isEmployee, tools: toolsIn, clients: clientsIn, achievements: achievementsIn, coverImage, idCard,
      hobbies, podcasts, events, innovations, workShowcase,
      slug,
      ...teamMemberData
    } = mockReqBody;
    
    console.log("\nDestructured workShowcase from req.body is:", JSON.stringify(workShowcase, null, 2));
    
    if (member.user) {
      const userUpdate = {};
      if (email !== undefined) userUpdate.email = email;
      if (emp_id !== undefined) userUpdate.emp_id = emp_id;
      if (phone !== undefined) userUpdate.phone = phone;
      if (doj !== undefined) userUpdate.doj = doj ? new Date(doj) : null;
      if (rate !== undefined) userUpdate.rate = rate;
      if (clickupId !== undefined) userUpdate.clickupId = clickupId;
      if (isEmployee !== undefined) userUpdate.isEmployee = isEmployee;
      if (coverImage !== undefined) userUpdate.coverImage = coverImage;
      if (idCard !== undefined) userUpdate.idCard = idCard;
      if (hobbies !== undefined) userUpdate.hobbies = hobbies;
      if (podcasts !== undefined) userUpdate.podcasts = podcasts;
      if (events !== undefined) userUpdate.events = events;
      
      if (innovations !== undefined) {
        let parsedInnovations = innovations;
        if (typeof innovations === 'string') {
          try { parsedInnovations = JSON.parse(innovations); } catch (e) { parsedInnovations = []; }
        }
        userUpdate.innovations = Array.isArray(parsedInnovations) ? parsedInnovations : [];
      }
      
      if (workShowcase !== undefined) {
        let parsedWorkShowcase = workShowcase;
        if (typeof workShowcase === 'string') {
          try { parsedWorkShowcase = JSON.parse(workShowcase); } catch (e) { parsedWorkShowcase = []; }
        }
        userUpdate.workShowcase = Array.isArray(parsedWorkShowcase) ? parsedWorkShowcase : [];
      }
      
      console.log("\nuserUpdate object before findByIdAndUpdate:", JSON.stringify(userUpdate, null, 2));
      
      const savedUser = await User.findByIdAndUpdate(member.user._id, { $set: userUpdate }, { new: true, runValidators: false });
      console.log("\nSaved User in DB workShowcase:", JSON.stringify(savedUser.workShowcase, null, 2));
    }
    
    // Simulate updating teamMember:
    const updatedProfile = await TeamMember.findByIdAndUpdate(
      member._id,
      teamMemberData,
      { new: true, runValidators: true }
    ).populate({
      path: "user",
      select: "email name role isEmployee emp_id clickupId phone doj rate tools clients achievements coverImage idCard hobbies podcasts events innovations workShowcase"
    });
    
    console.log("\nResult populated updatedProfile.user.workShowcase:", JSON.stringify(updatedProfile.user.workShowcase, null, 2));
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
