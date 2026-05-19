const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: 'client' });
    console.log(`Found ${users.length} clients:`);
    for (const u of users) {
      console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, clickupId: ${u.clickupId}, clickupListId: ${u.clickupListId}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
