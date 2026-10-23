const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://socialbureau:C0Jx7EcpyH5NtiXb@cluster0.epqp7yu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");

  const Review = require("../models/reviewModel");

  // Deleting the two reviews by their IDs
  const targetIds = ["6a217202789aeda08fc26726", "6a21721d789aeda08fc26732"];

  const result = await Review.deleteMany({ _id: { $in: targetIds } });
  console.log(`Successfully deleted ${result.deletedCount} reviews.`);

  await mongoose.disconnect();
};

run().catch(console.error);
