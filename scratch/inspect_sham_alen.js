const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    // Register schemas in order
    require('../models/userModel');
    require('../models/toolModel');
    require('../models/clientsModel');
    require('../models/reviewModel');
    require('../models/achievementModel');
    const TeamMember = require('../models/teamMemberModel');
    
    const sham = await TeamMember.findOne({ slug: 'shamsk' }).populate('user');
    const alen = await TeamMember.findOne({ slug: 'alen-jacob' }).populate('user');
    
    console.log("=== SHAM SK ===");
    if (sham) {
      console.log(JSON.stringify(sham.toObject(), null, 2));
    } else {
      console.log("Sham Sk not found");
    }
    
    console.log("\n=== ALEN JACOB ===");
    if (alen) {
      console.log(JSON.stringify(alen.toObject(), null, 2));
    } else {
      console.log("Alen Jacob not found");
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
