const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");

const MIN_TOPUP_PAISE = 100 * 100;
const MAX_TOPUP_PAISE = 100000 * 100;

async function getBalancePaise(userId) {
  const wallet = await Wallet.findOne({ userId }).lean();
  return wallet ? wallet.balancePaise : 0;
}

async function applyCredit(userId, amountPaise) {
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { balancePaise: amountPaise }, $setOnInsert: { userId } },
    { upsert: true, new: true },
  );
  return wallet.balancePaise;
}

// Atomic conditional decrement: never lets the balance go negative.
async function applyDebit(userId, amountPaise) {
  const wallet = await Wallet.findOneAndUpdate(
    { userId, balancePaise: { $gte: amountPaise } },
    { $inc: { balancePaise: -amountPaise } },
    { new: true },
  );
  return wallet ? wallet.balancePaise : null;
}

// Credits a captured Razorpay top-up exactly once; safe to call from both verify and webhook.
async function creditTopup(orderId, payment) {
  const claimed = await WalletTransaction.findOneAndUpdate(
    { razorpayOrderId: orderId, type: "topup", status: "pending", amountPaise: payment.amount },
    { $set: { status: "completed", razorpayPaymentId: payment.id } },
    { new: true },
  );
  if (!claimed) return null;
  const balance = await applyCredit(claimed.userId, claimed.amountPaise);
  claimed.balanceAfterPaise = balance;
  await claimed.save();
  return claimed;
}

// Debits the wallet once per reference. Returns { ok, duplicate, insufficient, balancePaise }.
async function debitOnce({ userId, amountPaise, reference, type, bookingId }) {
  try {
    await WalletTransaction.create({ userId, type, direction: "debit", amountPaise, reference, bookingId, status: "pending" });
  } catch (error) {
    if (error.code === 11000) return { ok: false, duplicate: true };
    throw error;
  }
  const balancePaise = await applyDebit(userId, amountPaise);
  if (balancePaise === null) {
    await WalletTransaction.deleteOne({ reference, status: "pending" });
    return { ok: false, insufficient: true };
  }
  await WalletTransaction.updateOne({ reference }, { $set: { status: "completed", balanceAfterPaise: balancePaise } });
  return { ok: true, balancePaise };
}

async function refundOnce({ userId, amountPaise, reference, type, bookingId }) {
  try {
    await WalletTransaction.create({ userId, type, direction: "credit", amountPaise, reference, bookingId, status: "pending" });
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }
  const balancePaise = await applyCredit(userId, amountPaise);
  await WalletTransaction.updateOne({ reference }, { $set: { status: "completed", balanceAfterPaise: balancePaise } });
  return balancePaise;
}

module.exports = { MIN_TOPUP_PAISE, MAX_TOPUP_PAISE, getBalancePaise, creditTopup, debitOnce, refundOnce };
