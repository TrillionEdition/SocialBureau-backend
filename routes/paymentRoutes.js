const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controllers/paymentController");

// Allow public access to payment endpoints so users can pay without logging in
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);

module.exports = router;
