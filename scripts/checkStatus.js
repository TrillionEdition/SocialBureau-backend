const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/userModel");
const TeamMember = require("../models/teamMemberModel");

async function checkStatus() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    
    const email = "webjr.socialbureau@gmail.com";
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User ${email} NOT FOUND`);
      process.exit(0);
    }

    console.log("\n--- USER DOCUMENT ---");
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`isEmployee: ${user.isEmployee}`);

    const profile = await TeamMember.findOne({ user: user._id });
    if (!profile) {
      console.log("\n--- TEAM MEMBER PROFILE ---");
      console.log("NOT FOUND");
    } else {
      console.log("\n--- TEAM MEMBER PROFILE ---");
      console.log(`ID: ${profile._id}`);
      console.log(`Name: ${profile.name}`);
      console.log(`Role: ${profile.role}`);
      console.log(`Image: ${profile.image}`);
      console.log(`isPublic: ${profile.isPublic}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkStatus();
