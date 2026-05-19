require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./database/connectDB");
const router = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");

const app = express();

// ================== ALLOWED ORIGINS ==================
const allowedOrigins = [
  "https://www.socialbureau.in",
  "https://socialbureau.in",
  "http://localhost:5173",
  "http://localhost:5174",
];

// ================== MIDDLEWARE ==================
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.use(
  session({
    name: "sb.sid",
    secret: process.env.SESSION_SECRET || "fallback-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",      // HTTPS only in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
    },
  })
);

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ================== ROUTES ==================
app.use("/", router);

// ================== ERROR HANDLING ==================
app.use(errorHandler);

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Wait for database connection before starting server
    await connectDB();
    
    // Start cron jobs after DB is connected
    require("./cron/newsletterCron");
    require("./cron/meetingCron");

    app.listen(PORT, () => {
      console.log(`\n${"=".repeat(50)}`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${"=".repeat(50)}\n`);
    });
  } catch (err) {
    console.error("❌ Critical Failure: Could not start server due to DB connection error.");
    console.error(err);
    // In production, we might want to keep the process alive for health checks, 
    // but here we fail fast so it can be restarted.
    process.exit(1);
  }
};

startServer();

module.exports = app;
