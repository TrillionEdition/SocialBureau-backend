const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    // Dynamically register all models to avoid populate errors
    const modelsDir = path.join(__dirname, '../models');
    fs.readdirSync(modelsDir).forEach(file => {
      if (file.endsWith('.js')) {
        try {
          require(path.join(modelsDir, file));
        } catch (e) {
          console.warn(`Could not load model ${file}:`, e.message);
        }
      }
    });

    const TeamMember = mongoose.model('TeamMember');
    const members = await TeamMember.find({}).populate('user');
    
    console.log(`Found ${members.length} team members:`);
    members.forEach(m => {
      console.log(`- Name: ${m.name}, Slug: ${m.slug}`);
      console.log(`  Socials:`, m.socials);
      if (m.user) {
        console.log(`  User Email: ${m.user.email}`);
      } else {
        console.log(`  User: NOT ASSOCIATED`);
      }
    });
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
