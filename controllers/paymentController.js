const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/userModel");
const Partnership = require("../models/partnershipModel");

/**
 * Initialize Razorpay Instance
 */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Debug: Check if keys are loaded
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ CRITICAL: Razorpay Keys are missing from .env!");
} else {
  try {
    console.log("✅ Razorpay Keys loaded successfully (ID starts with:", String(process.env.RAZORPAY_KEY_ID).substring(0, 8), ")");
  } catch (e) {
    console.log("✅ Razorpay Keys loaded");
  }
}

/**
 * @desc    Create a new Razorpay Order
 * @route   POST /api/payments/create-order
 * @access  Private
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body || {};

    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Create Order failed: Razorpay keys missing");
      return res.status(500).json({ success: false, message: "Payment gateway not configured" });
    }

    const options = {
      amount: Math.round(amountNum * 100), // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    console.log("Attempting to create Razorpay order with options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created successfully:", order && order.id);

    if (!order) {
      return res.status(500).json({ success: false, message: "Error creating order" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Error:", error && (error.stack || error));
    const msg = (error && (error.message || error.error || error.description)) || "Razorpay API error";
    const payload = { success: false, message: msg };
    if (process.env.NODE_ENV !== "production") {
      payload.error = error && (error.stack || error);
    }
    res.status(500).json(payload);
  }
};

/**
 * @desc    Verify Razorpay Payment Signature
 * @route   POST /api/payments/verify
 * @access  Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, reportId, amt, free } = req.body;

    // If marked as free (zero-amount), skip signature verification and mark paid directly
    if (free === true || (amt !== undefined && Number(amt) === 0)) {
      console.log("Free payment flow detected for report:", reportId);
      if (reportId) {
        const AuditReport = require("../modules/auditReports/auditReportModel");
        const update = { isPaid: true };
        if (amt !== undefined) {
          const parsedAmt = parseFloat(amt);
          if (!isNaN(parsedAmt)) update.amt = parsedAmt;
        }
        const updatedReport = await AuditReport.findByIdAndUpdate(reportId, update, { new: true });
        console.log("📄 AuditReport Free Update Result:", updatedReport ? "SUCCESS" : "REPORT NOT FOUND");
      }

      return res.status(200).json({ success: true, message: "Marked as paid (free)" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      console.log("✅ Payment verification successful for order:", razorpay_order_id);
      
      // If payment is for a specific Audit Report, update it
      if (reportId) {
        console.log("🔍 Attempting to mark AuditReport paid:", reportId);
        const AuditReport = require("../modules/auditReports/auditReportModel");
        const update = { isPaid: true };
        if (amt !== undefined) {
          const parsedAmt = parseFloat(amt);
          if (!isNaN(parsedAmt)) update.amt = parsedAmt;
        }
        const updatedReport = await AuditReport.findByIdAndUpdate(
          reportId,
          update,
          { new: true }
        );
        console.log("📄 AuditReport Update Result:", updatedReport ? "SUCCESS" : "REPORT NOT FOUND");
      } else if (req.user && req.user.id) {
        // Otherwise, standard user/influencer workflow updates
        console.log("🔍 Attempting to update User ID:", req.user.id);
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id, 
          { hasPaidInfluencer: true },
          { new: true }
        );
        console.log("👤 User Update Result:", updatedUser ? "SUCCESS" : "USER NOT FOUND");
        
        const updatedPartner = await Partnership.findOneAndUpdate(
          { user: req.user.id },
          { 
            hasPaid: true,
            user: req.user.id
          },
          { upsert: true, new: true }
        );
        console.log("🤝 Partnership Payment Status Updated:", updatedPartner ? "SUCCESS" : "FAILED");
      }

      console.log("✅ Database sync complete for order:", razorpay_order_id);

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid signature, payment verification failed",
      });
    }
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
