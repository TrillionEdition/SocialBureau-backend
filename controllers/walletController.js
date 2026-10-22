const crypto = require("crypto");
const WalletTransaction = require("../models/WalletTransaction");
const { verifyPaymentSignature, makeRazorpay } = require("../utils/campaignPayment");
const { MIN_TOPUP_PAISE, MAX_TOPUP_PAISE, getBalancePaise, creditTopup } = require("../services/walletService");

const publicTransaction = (tx) => ({
  id: tx._id,
  type: tx.type,
  direction: tx.direction,
  amountPaise: tx.amountPaise,
  balanceAfterPaise: tx.balanceAfterPaise,
  status: tx.status,
  bookingId: tx.bookingId,
  createdAt: tx.createdAt,
});

exports.getWallet = async (req, res) => {
  try {
    const [balancePaise, transactions] = await Promise.all([
      getBalancePaise(req.user.id),
      WalletTransaction.find({ userId: req.user.id, status: "completed" }).sort({ createdAt: -1 }).limit(20),
    ]);
    return res.json({ balancePaise, currency: "INR", transactions: transactions.map(publicTransaction), minTopupPaise: MIN_TOPUP_PAISE, maxTopupPaise: MAX_TOPUP_PAISE });
  } catch (error) {
    return res.status(500).json({ message: "Wallet is unavailable" });
  }
};

exports.createTopupOrder = async (req, res) => {
  try {
    const amount = Number(req.body && req.body.amount);
    const amountPaise = Math.round(amount * 100);
    if (!Number.isFinite(amount) || Math.abs(amount * 100 - amountPaise) > 1e-6) {
      return res.status(400).json({ message: "Enter a valid amount with at most two decimals." });
    }
    if (amountPaise < MIN_TOPUP_PAISE || amountPaise > MAX_TOPUP_PAISE) {
      return res.status(400).json({ message: `Top-up must be between INR ${MIN_TOPUP_PAISE / 100} and INR ${MAX_TOPUP_PAISE / 100}.` });
    }
    const reference = `topup:${crypto.randomBytes(12).toString("hex")}`;
    const order = await makeRazorpay().orders.create({ amount: amountPaise, currency: "INR", receipt: reference.slice(6, 6 + 24) });
    await WalletTransaction.create({
      userId: req.user.id, type: "topup", direction: "credit", amountPaise, reference, razorpayOrderId: order.id, status: "pending",
    });
    return res.status(201).json({ orderId: order.id, amount: amountPaise, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    return res.status(502).json({ message: "Unable to start wallet top-up" });
  }
};

exports.verifyTopup = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (typeof orderId !== "string" || typeof paymentId !== "string") return res.status(400).json({ message: "Invalid payment details" });
    const tx = await WalletTransaction.findOne({ razorpayOrderId: orderId, userId: req.user.id, type: "topup" });
    if (!tx) return res.status(404).json({ message: "Top-up not found" });
    if (!verifyPaymentSignature(orderId, paymentId, signature)) return res.status(400).json({ message: "Invalid payment signature" });
    if (tx.status === "completed") return res.json({ success: true, balancePaise: await getBalancePaise(req.user.id) });
    const payment = await makeRazorpay().payments.fetch(paymentId);
    if (payment.order_id !== orderId || payment.status !== "captured" || payment.amount !== tx.amountPaise || payment.currency !== "INR") {
      return res.status(409).json({ message: "Payment is not captured for the expected amount yet." });
    }
    await creditTopup(orderId, payment);
    return res.json({ success: true, balancePaise: await getBalancePaise(req.user.id) });
  } catch (error) {
    return res.status(502).json({ message: "Unable to verify top-up" });
  }
};
