const mongoose = require("mongoose");
const Partnership = require("../models/partnershipModel");
require("dotenv").config();

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI);
  const partner = await Partnership.findOne({ param: "aami" });
  if (partner) {
    console.log("Partner found:", JSON.stringify(partner, null, 2));
  } else {
    console.log("Partner 'aami' not found.");
  }
  process.exit();
}

checkUser();
