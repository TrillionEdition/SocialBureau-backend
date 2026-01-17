require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./database/connectDB");
const { router } = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const blogRoutes = require("./routes/blogRoutes");
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
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, origin);        
      } else {
        console.warn("Blocked by CORS:", origin);        
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser())

app.use(
    session({
        secret:"secret",
        resave:false,
        saveUninitialized:true
    })
)

app.use('/', router);
// app.use('/blog', blogRoutes);
// // app.use("/api/newsletter", require("./routes/newsletterRoutes"));
//  app.use("/api/jobs", require("./routes/jobRoutes"));
app.use(errorHandler)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));