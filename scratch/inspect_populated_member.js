const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/socialbureau';
console.log("Connecting to:", mongoURI);

const User = require('../models/userModel');
const TeamMember = require('../models/teamMemberModel');

async function inspect() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Find Sham Sk
    const member = await TeamMember.findOne({ name: /sham/i }).populate({
      path: "user",
      select: "email name role isEmployee emp_id clickupId phone doj rate tools clients achievements coverImage idCard location rating ratingCount exp hobbies podcasts events innovations workShowcase education certifications blogs",
    });

    if (member) {
      console.log("=== POPULATED MEMBER ===");
      console.log(JSON.stringify(member.toJSON(), null, 2));
    } else {
      console.log("Member Sham Sk not found");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

inspect();
