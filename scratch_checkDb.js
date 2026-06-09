const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://socialbureau:C0Jx7EcpyH5NtiXb@cluster0.epqp7yu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
