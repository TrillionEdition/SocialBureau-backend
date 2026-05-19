const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controllers/paymentController");
const userAuthentication = require("../middlewares/userAuthentication");

// All payment routes are protected (require login)
router.post("/create-order", userAuthentication, createOrder);
router.post("/verify", userAuthentication, verifyPayment);

module.exports = router;
