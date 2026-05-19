const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find Anjay Ramesh by ID
    const user = await User.findById('68f618bad488e95f18bd99ec');
    console.log("Name:", user.name);
    console.log("clickupId value:", user.clickupId);
    console.log("typeof clickupId:", typeof user.clickupId);
    
    // Let's get the raw mongodb doc type
    const rawDoc = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('68f618bad488e95f18bd99ec') });
    console.log("Raw doc clickupId type in MongoDB:", typeof rawDoc.clickupId);
    console.log("Raw doc clickupId value:", rawDoc.clickupId);

    // Try finding by raw collection
    const rawFoundNumber = await mongoose.connection.db.collection('users').findOne({ clickupId: 88409188 });
    console.log("Raw found by number:", rawFoundNumber ? rawFoundNumber.name : "null");

    const rawFoundString = await mongoose.connection.db.collection('users').findOne({ clickupId: '88409188' });
    console.log("Raw found by string:", rawFoundString ? rawFoundString.name : "null");

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
