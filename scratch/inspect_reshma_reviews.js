const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://socialbureau:C0Jx7EcpyH5NtiXb@cluster0.epqp7yu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");

  const TeamMember = require("../models/teamMemberModel");
  const User = require("../models/userModel");
  const Review = require("../models/reviewModel");

  const member = await TeamMember.findOne({ slug: "reshma-vijayan" });
  if (!member) {
    console.log("Reshma Vijayan team member not found by slug");
    await mongoose.disconnect();
    return;
  }
  console.log("Found TeamMember:", member.name, "User ID:", member.user);

  if (member.user) {
    const user = await User.findById(member.user);
    if (user) {
      console.log("Found User:", user.name, "Email:", user.email);
      // Let's find reviews where employee is user._id
      const reviews = await Review.find({ employee: user._id });
      console.log(`Found ${reviews.length} reviews for Reshma:`);
      reviews.forEach(r => {
        console.log(`- ID: ${r._id}, Name: ${r.name}, Rating: ${r.rating}, Approved: ${r.approved}, Content: "${r.review}"`);
      });
    } else {
      console.log("User not found by ID:", member.user);
    }
  }

  await mongoose.disconnect();
};

run().catch(console.error);
