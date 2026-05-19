const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ clickupListId: { $ne: null, $exists: true } });
    console.log(`Found ${users.length} users with clickupListId:`);
    for (const u of users) {
      console.log(`- ${u.name} (${u.email}): ${u.clickupListId}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
