require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./database/connectDB");
const router = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const app = express();

connectDB().then(() => {
  // start cron jobs (newsletter, etc.) AFTER DB is connected
  require("./cron/newsletterCron");
  // console.log("✅ Cron jobs initialized after DB connection");
}).catch(err => {
  console.error("❌ Failed to start cron jobs:", err);
});

const allowedOrigins = [
  "https://www.socialbureau.in",
  "https://socialbureau.in",
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser())

app.set("trust proxy", 1);

app.use(
  session({
    name: "sb.sid",
    secret: process.env.SESSION_SECRET || "fallback-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',       // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",   // cross-domain in production
      httpOnly: true,
    },
  })
);

// app.use(
//   session({
//     secret: "secret",
//     resave: false,
//     saveUninitialized: true
//   })
// )

app.use('/', router);
app.use(errorHandler)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));