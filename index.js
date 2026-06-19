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
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
);

// Handle OPTIONS preflight requests explicitly
app.options("*", cors());


app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

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
    await connectDB();
    const User = require("./models/userModel");
    try {
      await User.updateMany({}, { $set: { isClickUpVerified: false } });
      const result = await User.updateMany(
        { email: { $in: ["ceo@socialbureau.in", "web@socialbureau.in", "admin@socialbureau.in", "webjr.socialbureau@gmail.com", "pmo.socialbureau@gmail.com"] } },
        { $set: { isClickUpVerified: true } }
      );
      console.log(`✅ Auto-verified ClickUp badge for ${result.modifiedCount} users`);
    } catch (dbErr) {
      console.error("⚠️ Failed to auto-verify ClickUp badge users on startup:", dbErr.message);
    }
    require("./cron/newsletterCron");
    require("./cron/meetingCron");
    require("./cron/fifaCron");

    app.listen(PORT, () => {
      console.log(`\n${"=".repeat(50)}`);
      console.log(`🚀 SOCIAL BUREAU BACKEND IS NOW ONLINE ON PORT ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${"=".repeat(50)}\n`);
    });
  } catch (err) {
    console.error("❌ Critical Failure: Could not start server due to DB connection error.");
    console.error(err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
