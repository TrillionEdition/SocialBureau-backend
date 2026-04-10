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

const {
  subscribeNewsletter,
  sendTestNewsletter,
  getSubscriberCount,
  unsubscribeNewsletter,
} = require("../controllers/newsLetterController");

newsletterRoutes.post("/subscribe", subscribeNewsletter);
newsletterRoutes.post("/unsubscribe", unsubscribeNewsletter);

// Admin/Testing routes (add auth middleware if needed)
newsletterRoutes.post("/send-test", sendTestNewsletter);
newsletterRoutes.get("/stats", getSubscriberCount);

module.exports = newsletterRoutes;