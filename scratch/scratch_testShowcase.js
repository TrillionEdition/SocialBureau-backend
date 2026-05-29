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
      console.error("No associated User document found for the first member:", member.name);
      mongoose.disconnect();
      return;
    }
    
    console.log("Found first member:", member.name, "User ID:", member.user._id);
    console.log("Existing workShowcase:", JSON.stringify(member.user.workShowcase, null, 2));
    
    const testShowcases = [
      {
        category: "CONTENT CAMPAIGN",
        title: "Test Showcase Entry",
        description: "This is a diagnostic test to see if workShowcase saves correctly in MongoDB.",
        images: ["https://example.com/test.jpg"],
        link: "https://example.com"
      }
    ];
    
    console.log("Attempting to update user workShowcase directly via Mongoose...");
    try {
      const updatedUser = await User.findByIdAndUpdate(
        member.user._id,
        { $set: { workShowcase: testShowcases } },
        { new: true, runValidators: true }
      );
      
      console.log("Save completed successfully!");
      console.log("Updated workShowcase in DB:", JSON.stringify(updatedUser.workShowcase, null, 2));
    } catch (err) {
      console.error("Error during findByIdAndUpdate:", err.message);
      if (err.errors) {
        console.error("Validation errors details:", JSON.stringify(err.errors, null, 2));
      }
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
