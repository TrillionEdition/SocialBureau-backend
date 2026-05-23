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
    
    const member = await TeamMember.findOne({ slug: 'shamsk' }).populate('user');
    if (!member || !member.user) {
      console.error("Sham Sk member or user not found!");
      mongoose.disconnect();
      return;
    }
    
    console.log("Found user ID:", member.user._id);
    
    const testInnovations = [
      {
        type: "INNOVATION",
        date: "May 22, 2026",
        title: "Dynamic AI Sandbox Test",
        content: "Testing database persistence directly through Mongoose schemas.",
        url: "https://google.com",
        likes: 12,
        comments: 4
      }
    ];
    
    console.log("Attempting to update user innovations to:", JSON.stringify(testInnovations, null, 2));
    
    try {
      const updatedUser = await User.findByIdAndUpdate(
        member.user._id,
        { $set: { innovations: testInnovations } },
        { new: true, runValidators: true }
      );
      
      console.log("Save completed successfully!");
      console.log("Updated Innovations in DB:", JSON.stringify(updatedUser.innovations, null, 2));
    } catch (err) {
      console.error("Error during findByIdAndUpdate:", err);
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
