const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    const User = require('../models/userModel');
    const TeamMember = require('../models/teamMemberModel');
    
    const members = await TeamMember.find({}).populate('user');
    console.log(`Found ${members.length} team members:`);
    members.forEach(m => {
      console.log(`- Member Name: ${m.name}`);
      console.log(`  image1 (TeamMember): ${m.image1}`);
      if (m.user) {
        console.log(`  User Name: ${m.user.name}`);
        console.log(`  coverImage (User): ${m.user.coverImage}`);
      } else {
        console.log(`  User: null`);
      }
      console.log('-------------------');
    });
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
