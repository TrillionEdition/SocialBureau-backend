const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({
      $or: [
        { role: 'client' },
        { clickupId: { $ne: null, $exists: true } },
        { clickupListId: { $ne: null, $exists: true } }
      ]
    });
    console.log(`Found ${users.length} filtered users:`);
    for (const u of users) {
      console.log(`- ID: ${u._id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  clickupId: ${u.clickupId}`);
      console.log(`  clickupListId: ${u.clickupListId}`);
      console.log(`  clickupChatViewId: ${u.clickupChatViewId}`);
      console.log(`  clickupToken: ${u.clickupToken ? (u.clickupToken.substring(0, 10) + '...') : undefined}`);
      console.log(`  isEmployee: ${u.isEmployee}`);
      console.log('----------------------------');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
