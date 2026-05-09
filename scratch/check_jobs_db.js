const mongoose = require("mongoose");
const Job = require("../models/JobModel");
require("dotenv").config({ path: "c:/Users/webas/BC/SocialBureau-backend/.env" });

async function checkJobs() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ isActive: true });
    const inactiveJobs = await Job.countDocuments({ isActive: false });

    console.log(`Total Jobs: ${totalJobs}`);
    console.log(`Active Jobs: ${activeJobs}`);
    console.log(`Inactive Jobs: ${inactiveJobs}`);

    if (totalJobs > 0) {
        const jobs = await Job.find().limit(5);
        console.log("Sample Jobs:");
        jobs.forEach(j => {
            console.log(`- ${j.title} (ID: ${j._id}, Active: ${j.isActive}, Slug: ${j.slug})`);
        });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkJobs();
