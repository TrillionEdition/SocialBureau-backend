const mongoose = require("mongoose");
const Partnership = require("../models/partnershipModel");
require("dotenv").config();

async function findMismatched() {
  await mongoose.connect(process.env.MONGO_URI);
  const mismatched = await Partnership.find({ 
    templateId: "influencer", 
    category: "student" 
  });
  console.log(`Found ${mismatched.length} mismatched partners.`);
  mismatched.forEach(p => console.log(`- ${p.param} (${p.name})` ));
  
  if (mismatched.length > 0) {
    console.log("Updating categories to 'influencer'...");
    const result = await Partnership.updateMany(
      { templateId: "influencer", category: "student" },
      { $set: { category: "influencer" } }
    );
    console.log(`Updated ${result.modifiedCount} records.`);
  }

  process.exit();
}

findMismatched();
