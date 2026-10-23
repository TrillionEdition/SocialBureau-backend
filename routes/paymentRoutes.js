const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, checkPageAccess, getPageContent, verifyPagePayment } = require("../controllers/paymentController");
const userAuthentication = require("../middlewares/userAuthentication");
const optionalAuthentication = require("../middlewares/optionalAuthentication");

// Allow public access to payment endpoints so users can pay without logging in
router.post("/create-order", optionalAuthentication, createOrder);
router.post("/verify", optionalAuthentication, verifyPayment);

// Gated-page purchases require login so access can persist to the user's account
router.get("/page-access/:pageSlug", userAuthentication, checkPageAccess);
router.get("/page-content/:pageSlug", userAuthentication, getPageContent);
router.post("/verify-page", userAuthentication, verifyPagePayment);

module.exports = router;
