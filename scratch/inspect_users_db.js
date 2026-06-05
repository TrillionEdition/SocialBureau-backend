const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("Connecting to (masked):", mongoUri.replace(/:[^:]*@/, ":****@"));
    await mongoose.connect(mongoUri);

    const User = require('../models/userModel');
    const TeamMember = require('../models/teamMemberModel');

    const reshma = await TeamMember.findOne({ slug: 'reshma-vijayan' }).populate('user');
    const athira = await TeamMember.findOne({ slug: 'athira-rajesh' }).populate('user');

    console.log("\n=== RESHMA DB RECORD ===");
    if (reshma) {
      console.log("Name:", reshma.name);
      console.log("Slug:", reshma.slug);
      console.log("User Email:", reshma.user?.email);
      console.log("ClickUp ID:", reshma.user?.clickupId);
      console.log("Is ClickUp Verified (User):", reshma.user?.isClickUpVerified);
    } else {
      console.log("Reshma not found");
    }

    console.log("\n=== ATHIRA DB RECORD ===");
    if (athira) {
      console.log("Name:", athira.name);
      console.log("Slug:", athira.slug);
      console.log("User Email:", athira.user?.email);
      console.log("ClickUp ID:", athira.user?.clickupId);
      console.log("Is ClickUp Verified (User):", athira.user?.isClickUpVerified);
    } else {
      console.log("Athira not found");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();
