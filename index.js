// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const connectDB = require("./database/connectDB");
// const router = require("./routes");
// const errorHandler = require("./middlewares/errorHandler");
// const atsRouter = require("./routes/ats");
// const cookieParser = require("cookie-parser");
// const session = require("express-session");
// const app = express();
// const helmet = require("helmet");
// connectDB().then(() => {
//   // start cron jobs (newsletter, etc.) AFTER DB is connected
//   require("./cron/newsletterCron");
//   // console.log("✅ Cron jobs initialized after DB connection");
// }).catch(err => {
//   console.error("Failed to start cron jobs:", err);
// });

// const allowedOrigins = [
//   "https://www.socialbureau.in",
//   "https://socialbureau.in",
//   "http://localhost:5173",
//   "http://localhost:5174",
// ];

// app.use(
//   cors({
//     origin: allowedOrigins,
//     credentials: true,
//   })
// );
// app.use(helmet());
// app.use(express.json());
// app.use(cookieParser())

// app.set("trust proxy", 1);

// app.use(
//   session({
//     name: "sb.sid",
//     secret: process.env.SESSION_SECRET || "fallback-secret-key-change-in-production",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: process.env.NODE_ENV === 'production',       // HTTPS only in production
//       sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",   // cross-domain in production
//       httpOnly: true,
//     },
//   })
// );

// // app.use(
// //   session({
// //     secret: "secret",
// //     resave: false,
// //     saveUninitialized: true
// //   })
// // )

// const path = require('path');
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use('/', router);
// app.use(errorHandler)

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/**
 * EXAMPLE: How to integrate Redis into your Express server
 * Copy this pattern to your actual server.js or app.js
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { invalidateCache } = require("./utils/cacheUtils");
const { redisClient } = require("./database/Redisconfig");
const { rateLimit, warmCache, cacheStats } = require("./utils/advancedCachingStrategies");
const app = express();

// ================== MIDDLEWARE ==================
app.use(helmet());
app.use(cors());
app.use(express.json());

// Apply rate limiting to API routes
app.use("/api/", rateLimit);

// ================== ROUTES ==================
const jobRoutes = require("./routes/jobRoutes");

app.use("/api/job", jobRoutes);

// ================== HEALTH CHECK ENDPOINTS ==================

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Cache stats endpoint (optional - for monitoring)
app.get("/api/cache-stats", (req, res) => {
  res.json(cacheStats.getStats());
});

// Clear cache endpoint (admin only)
app.post("/api/cache-clear", async (req, res) => {
  try {
    // Add auth check here if needed
    const { key } = req.body;

    if (key === "*") {
      const { clearAllCaches } = require("./utils/advancedCachingStrategies");
      await clearAllCaches();
      res.json({ message: "All caches cleared" });
    } else {
      await invalidateCache(key);
      res.json({ message: `Cache key '${key}' cleared` });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to clear cache", error: err.message });
  }
});

// ================== ERROR HANDLING ==================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// ================== MONGOOSE CONNECTION ==================
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`${"=".repeat(50)}\n`);

  // Warm cache on server start (optional)
  // await warmCache();

  // Or manually warm specific caches
  console.log("💾 Redis cache is ready");
});

// ================== GRACEFUL SHUTDOWN ==================
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");

  server.close(async () => {
    console.log("Server closed");

    // Close Redis connection
    redisClient.quit(() => {
      console.log("Redis connection closed");
      process.exit(0);
    });
  });
});

module.exports = app;