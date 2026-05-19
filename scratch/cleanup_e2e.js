const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const deleteRes = await User.deleteMany({ email: 'e2e_client_test@gmail.com' });
    console.log("Deleted test users count:", deleteRes.deletedCount);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
