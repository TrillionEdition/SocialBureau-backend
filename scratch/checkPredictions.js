const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not set in your .env file.");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected successfully!");

  // Dynamic models load
  const FifaPrediction = require("../models/FifaPredictionModel");
  const FifaMatch = require("../models/FifaMatchModel");
  const User = require("../models/userModel");

  console.log("📥 Fetching all predictions...");
  const predictions = await FifaPrediction.find({})
    .populate("user", "name email")
    .populate("match", "teamA teamB status kickoffTime");

  console.log(`\n========================================`);
  console.log(`📊 TOTAL PREDICTIONS: ${predictions.length}`);
  console.log(`========================================\n`);

  if (predictions.length === 0) {
    console.log("No predictions placed yet.");
  } else {
    predictions.forEach((pred, index) => {
      const userName = pred.user ? pred.user.name : "Unknown User";
      const userEmail = pred.user ? pred.user.email : "";
      
      const matchDetails = pred.match 
        ? `${pred.match.teamA} vs ${pred.match.teamB} (${pred.match.kickoffTime})`
        : "Unknown Match";

      console.log(`Prediction #${index + 1}:`);
      console.log(`👤 Forecaster  : ${userName} (${userEmail})`);
      console.log(`⚽ Match       : ${matchDetails}`);
      console.log(`🎯 Forecast    : ${pred.predictedWinner === 'TeamA' ? (pred.match ? pred.match.teamA : 'Team A') : pred.predictedWinner === 'TeamB' ? (pred.match ? pred.match.teamB : 'Team B') : 'Draw'}`);
      console.log(`✅ Status      : ${pred.isCorrect === null ? 'Pending evaluation' : pred.isCorrect ? 'Correct outcome' : 'Incorrect outcome'}`);
      console.log(`🕒 Placed At   : ${pred.createdAt}`);
      console.log(`----------------------------------------`);
    });
  }

  await mongoose.disconnect();
  console.log("\n🔌 Database disconnected.");
};

run().catch((err) => {
  console.error("❌ Error running script:", err);
  mongoose.disconnect();
});
