// const express = require("express");
// const router = express.Router();

// const {
//   subscribeNewsletter,
//   sendTestNewsletter,
// } = require("../controllers/newsLetterController");

// router.post("/subscribe", subscribeNewsletter);

// // ✅ ADD THIS
// router.post("/send-test", sendTestNewsletter);

// module.exports = router;



// routes/newsLetterRoutes.js
const express = require("express");
const newsletterRoutes = express.Router();
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const {
  subscribeNewsletter,
  sendTestNewsletter,
  getSubscriberCount,
  unsubscribeNewsletter,
} = require("../controllers/newsLetterController");

newsletterRoutes.post("/subscribe", subscribeNewsletter);
newsletterRoutes.post("/unsubscribe", unsubscribeNewsletter);

newsletterRoutes.post("/send-test", userAuthentication, isAdmin, sendTestNewsletter);
newsletterRoutes.get("/stats", userAuthentication, isAdmin, getSubscriberCount);

module.exports = newsletterRoutes;