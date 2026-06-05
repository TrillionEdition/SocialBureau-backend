const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    const User = require('../models/userModel');
    const users = await User.find({ clickupId: { $ne: null } });

    console.log("=== USERS WITH CLICKUP ID IN DB ===");
    users.forEach(u => {
      console.log(`Email: ${u.email} | ClickUp ID: ${u.clickupId} | Is Verified: ${u.isClickUpVerified}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();
