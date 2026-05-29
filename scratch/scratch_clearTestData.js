/**
 * Clear the diagnostic test innovation from Sham SK's user doc.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau")
  .then(async () => {
    const User = require('../models/userModel');
    const updated = await User.findByIdAndUpdate(
      '68f619eed488e95f18bd99ef',
      { $set: { innovations: [] } },
      { new: true }
    );
    console.log('Cleared innovations for Sham SK:', updated.innovations);
    mongoose.disconnect();
  })
  .catch(err => console.error(err));
