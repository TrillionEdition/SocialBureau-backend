const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");

  const Partnership = require("./models/partnershipModel");
  
  const allPartnerships = await Partnership.find({});
  console.log(`Total partnerships: ${allPartnerships.length}`);
  
  allPartnerships.forEach(p => {
    console.log(`- Name: ${p.name}, Slug: ${p.param}, isVisible: ${p.isVisible}, isFree: ${p.isFree}`);
  });

  await mongoose.disconnect();
};

run().catch(console.error);
