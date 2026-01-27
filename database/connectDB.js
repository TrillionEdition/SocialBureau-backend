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

    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Avoid Mongoose buffering commands while the connection is being established
      bufferCommands: false,
      // Fail fast if cannot select a server
      serverSelectionTimeoutMS: 10000,
      // Limit pool size for serverless environments
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 10,
    };

    globalAny._mongo.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    const conn = await globalAny._mongo.promise;
    globalAny._mongo.conn = conn;
    console.log("MongoDB connected (cached)");
    return conn;
  } catch (err) {
    globalAny._mongo.promise = null;
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = connectDB;