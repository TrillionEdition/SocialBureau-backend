const mongoose = require("mongoose");
require("dotenv").config();

// Use a global cached connection to survive serverless cold starts / repeated imports
// This pattern prevents creating a new connection on every invocation.
const globalAny = global;
if (!globalAny._mongo) globalAny._mongo = { conn: null, promise: null };

async function connectDB() {
  if (globalAny._mongo.conn) {
    // Reuse existing connection
    return globalAny._mongo.conn;
  }

  if (!globalAny._mongo.promise) {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not set in environment");
    }

    console.log("🔌 Attempting MongoDB connection...");
    console.log("📍 MongoDB URI (masked):", process.env.MONGO_URI.replace(/:[^:]*@/, ":****@"));

    const opts = {
      // Enable Mongoose buffering commands while the connection is being established
      // This prevents "MongooseError: Cannot call find() before initial connection is complete"
      bufferCommands: true,
      // Fail fast if cannot select a server
      serverSelectionTimeoutMS: 10000,
      // Limit pool size for serverless environments
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 10,
    };

    globalAny._mongo.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongooseInstance) => {
      console.log("✅ New MongoDB connection established successfully");
      return mongooseInstance;
    });
  }

  try {
    const conn = await globalAny._mongo.promise;
    globalAny._mongo.conn = conn;
    return conn;
  } catch (err) {
    globalAny._mongo.promise = null;
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Troubleshooting tips:");
    console.error("   1. Check MongoDB Atlas IP whitelist includes your machine");
    console.error("   2. Verify MONGO_URI credentials are correct in .env");
    console.error("   3. Ensure MongoDB cluster is active");
    console.error("   4. Check network connectivity to MongoDB servers");
    throw err;
  }
}

module.exports = connectDB;