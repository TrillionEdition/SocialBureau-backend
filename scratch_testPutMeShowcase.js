const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    const TeamMember = require('./models/teamMemberModel');
    const User = require('./models/userModel');
    
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
    console.log("SIMULATING EMPLOYEE PUT /ME FOR USER:", member.name);
    console.log("=======================================================");
    
    // Simulate req.body sent by TeamDashboard on Save Profile:
    const mockReqBody = {
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
      
      // User fields flat:
      coverImage: member.user.coverImage || "",
      idCard: member.user.idCard || "",
      location: member.user.location || "",
      phone: member.user.phone || "",
      clickupId: member.user.clickupId || "",
      emp_id: member.user.emp_id || "",
      doj: member.user.doj ? member.user.doj.toISOString().split('T')[0] : "",
      rate: member.user.rate || "",
      tools: member.user.tools || [],
      clients: member.user.clients || [],
      achievements: member.user.achievements || [],
      hobbies: member.user.hobbies || [],
      podcasts: member.user.podcasts || [],
      events: member.user.events || [],
      innovations: member.user.innovations || [],
      workShowcase: [
        {
          category: "EMPLOYEE DYNAMIC TEST",
          title: "Employee Test Title",
          description: "Employee test description details.",
          images: ["https://example.com/employee.jpg"],
          link: "https://employee.com"
        }
      ]
    };
    
    // ----------------------------------------------------
    // SIMULATED BACKEND CODE (from PUT /me)
    // ----------------------------------------------------
    const {
      email, password, emp_id, phone, doj, rate, clickupId, isEmployee, tools, clients, achievements, coverImage, idCard,
      hobbies, podcasts, events, innovations, workShowcase,
      slug,
      ...teamMemberData
    } = mockReqBody;
    
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
