// const razorpay = require("../utils/razorpay");
// const Payment = require("../models/payment.model");
// const crypto = require("crypto");

// exports.createOrder = async (req, res) => {
//   try {
//     const { amount } = req.body;

//     const order = await razorpay.orders.create({
//       amount: amount * 100,
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     });

//     await Payment.create({
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       status: "created",
//     });

//     res.status(200).json(order);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId, paymentId, signature } = req.body;

//     const body = orderId + "|" + paymentId;

//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest("hex");

//     if (expectedSignature !== signature) {
//       return res.status(400).json({ message: "Invalid signature" });
//     }

//     await Payment.findOneAndUpdate(
//       { orderId },
//       {
//         paymentId,
//         signature,
//         status: "paid",
//       }
//     );

//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
