const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    const User = require('./models/userModel');
    const TeamMember = require('./models/teamMemberModel');
    
    const member = await TeamMember.findOne({ slug: 'reshma-vijayan' }).populate('user');
    if (!member) {
      console.error("Reshma not found!");
      mongoose.disconnect();
      return;
    }
    
    console.log("Reshma Profile:");
    console.log("TeamMember:", JSON.stringify(member, null, 2));
    if (member.user) {
      console.log("Associated User details:");
      console.log("Hobbies:", member.user.hobbies);
      console.log("Education:", member.user.education);
      console.log("Certifications:", member.user.certifications);
      console.log("Innovations:", member.user.innovations);
      console.log("Work Showcase:", member.user.workShowcase);
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
