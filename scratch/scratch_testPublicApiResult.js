const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    // Register schemas
    require('../models/toolModel');
    require('../models/clientsModel');
    require('../models/reviewModel');
    require('../models/achievementModel');
    
    const TeamMember = require('../models/teamMemberModel');
    const User = require('../models/userModel');
    
    const slug = 'reshma-vijayan';
    const member = await TeamMember.findOne({ slug }).populate({
      path: 'user',
      populate: [
        { path: 'tools', select: 'toolName url icon description level -_id' },
        { path: 'clients', select: 'name website logo -_id' },
        { path: 'reviews', select: 'name company review rating createdAt -_id', match: { approved: true } },
        { path: 'achievements', select: 'title description image date createdAt' }
      ]
    });
    
    console.log("Returned Member.user keys:", Object.keys(member.user.toObject()));
    console.log("Work Showcase in API query:", member.user.workShowcase);
    console.log("Innovations in API query:", member.user.innovations);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
