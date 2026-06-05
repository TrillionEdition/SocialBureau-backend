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

    const users = await User.find({ blogs: { $exists: true, $not: { $size: 0 } } }).lean();
    console.log(`Found ${users.length} users with blogs:`);
    users.forEach(u => {
      console.log(`User: ${u.name} (${u.email})`);
      console.log("Blogs:", JSON.stringify(u.blogs, null, 2));
    });

    const members = await TeamMember.find({}).populate('user').lean();
    console.log(`\nAll TeamMembers:`);
    members.forEach(m => {
      console.log(`Member: ${m.name}, Slug: ${m.slug}`);
      if (m.user) {
        console.log(`  Associated User: ${m.user.name}, Blogs count: ${m.user.blogs ? m.user.blogs.length : 0}`);
      } else {
        console.log(`  No associated user!`);
      }
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

inspect();
