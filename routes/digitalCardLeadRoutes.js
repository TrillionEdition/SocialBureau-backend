const express = require("express");
const { rateLimit } = require("express-rate-limit");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/adminAuthentication");
const controller = require("../controllers/digitalCardLeadController");

const router = express.Router();
const submissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many submissions. Please try again later." },
});
const staff = [userAuthentication, adminAuthentication];

router.post("/", submissionLimiter, controller.createLead);
router.get("/", ...staff, controller.listLeads);
router.get("/export.csv", ...staff, controller.exportLeads);
router.patch("/:id", ...staff, controller.updateLead);
router.post("/:id/notes", ...staff, controller.addNote);
router.delete("/:id", ...staff, controller.deleteLead);

module.exports = router;
