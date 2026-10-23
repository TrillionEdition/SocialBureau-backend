const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, checkPageAccess, verifyPagePayment } = require("../controllers/paymentController");
const userAuthentication = require("../middlewares/userAuthentication");

// Allow public access to payment endpoints so users can pay without logging in
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);

// Gated-page purchases require login so access can persist to the user's account
router.get("/page-access/:pageSlug", userAuthentication, checkPageAccess);
router.post("/verify-page", userAuthentication, verifyPagePayment);

module.exports = router;
