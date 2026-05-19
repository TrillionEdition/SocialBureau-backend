const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up test users
    const deleteRes = await User.deleteMany({ email: /new_unique_email/ });
    console.log("Deleted test users count:", deleteRes.deletedCount);

    // Test findOne with string clickupId
    const foundWithString = await User.findOne({ clickupId: '88409188' });
    console.log("Found with string:", foundWithString ? foundWithString.name : "null");

    // Test findOne with number clickupId
    const foundWithNumber = await User.findOne({ clickupId: 88409188 });
    console.log("Found with number:", foundWithNumber ? foundWithNumber.name : "null");

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
