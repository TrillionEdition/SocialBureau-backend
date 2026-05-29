const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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
      console.log(`- Name: ${m.name}, Slug: ${m.slug}, Role: ${m.role}`);
      if (m.user) {
        console.log(`  ClickUp ID: ${m.user.clickupId}, ClickUp List ID: ${m.user.clickupListId}`);
      }
    });
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
