const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not set.");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected successfully!");

  const FifaMatch = require("../models/FifaMatchModel");

  console.log("📥 Fetching all matches...");
  const matches = await FifaMatch.find({}).sort({ date: 1 });

  console.log(`\n========================================`);
  console.log(`📊 TOTAL MATCHES: ${matches.length}`);
  console.log(`========================================\n`);

  matches.forEach((m, index) => {
    console.log(`${index + 1}. [${m.status}] ${m.teamA} VS ${m.teamB}`);
    console.log(`   Date: ${m.date} | Kickoff: ${m.kickoffTime}`);
    console.log(`   Is Date <= Now? ${new Date(m.date) <= new Date()}`);
    console.log(`   Now: ${new Date()}`);
    console.log(`----------------------------------------`);
  });

  await mongoose.disconnect();
  console.log("\n🔌 Database disconnected.");
};

run().catch((err) => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
});
