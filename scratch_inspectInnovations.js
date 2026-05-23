const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    const TeamMember = require('./models/teamMemberModel');
    require('./models/userModel'); // load user model
    
    const members = await TeamMember.find({}).populate('user');
    console.log(`Found ${members.length} team members:`);
    members.forEach(m => {
      console.log(`- Name: ${m.name}, Slug: ${m.slug}`);
      if (m.user) {
        console.log(`  User ID: ${m.user._id}`);
        console.log(`  Innovations:`, JSON.stringify(m.user.innovations, null, 2));
      } else {
        console.log(`  No associated user object found.`);
      }
    });
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
