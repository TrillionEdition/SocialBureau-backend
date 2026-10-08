const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const ClientSubscription = require("../models/ClientSubscriptionModel");
const SubscriptionPaymentHistory = require("../models/SubscriptionPaymentHistoryModel");
const User = require("../models/userModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const DEFAULT_TOTAL_CYCLES = 120; // ~10 years of monthly cycles == "until cancelled"

const toDate = (unixSeconds) =>
  unixSeconds ? new Date(unixSeconds * 1000) : undefined;

// ─── Admin: List client-role users (for the assign-subscription picker) ────
exports.getClientUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { role: "client" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const clients = await User.find(filter, "name email phone").sort({ name: 1 });
    res.json({ data: clients });
  } catch (error) {
    console.error("Error fetching client users:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
};

// ─── Admin: Create a new client-role user ───────────────────────────────────
// Deliberately does NOT reuse the public /user/register endpoint — that
// endpoint logs the newly created user in by overwriting the caller's auth
// cookie, which would sign the admin out mid-flow.
exports.createClientUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailNormalized });
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await User.create({
      name,
      email: emailNormalized,
      phone,
      password: hashedPassword,
      role: "client",
      isEmployee: false,
    });

    res.status(201).json({
      data: { _id: client._id, name: client.name, email: client.email, phone: client.phone },
    });
  } catch (error) {
    console.error("Error creating client user:", error);
    res.status(500).json({ error: "Failed to create client" });
  }
};

// ─── Admin: Create/assign a subscription to a client ───────────────────────
// Two supported flows:
//  1. Link an existing Razorpay subscription (already created in the
//     Razorpay dashboard) by passing `razorpaySubscriptionId`.
//  2. Create a brand new subscription against an existing Razorpay Plan by
//     passing `razorpayPlanId` (+ amount/planName).
exports.createSubscription = async (req, res) => {
  try {
    const {
      clientId,
      razorpaySubscriptionId,
      razorpayPlanId,
      planName,
      amount,
      totalCount,
      notes,
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: "clientId is required" });
    }

    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    let razorpaySub;

    if (razorpaySubscriptionId) {
      // Flow 1: import an already-created Razorpay subscription.
      razorpaySub = await razorpay.subscriptions.fetch(razorpaySubscriptionId);
    } else {
      if (!razorpayPlanId || !planName || amount == null) {
        return res.status(400).json({
          error:
            "razorpayPlanId, planName, and amount are required when not linking an existing razorpaySubscriptionId",
        });
      }
      razorpaySub = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: totalCount || DEFAULT_TOTAL_CYCLES,
        customer_notify: 1,
        notes: {
          clientId: clientId.toString(),
          clientEmail: client.email,
        },
      });
    }

    const subscription = await ClientSubscription.create({
      clientId,
      planName: planName || razorpaySub.notes?.planName || "Monthly Subscription",
      razorpayPlanId: razorpaySub.plan_id || razorpayPlanId,
      razorpaySubscriptionId: razorpaySub.id,
      razorpayCustomerId: razorpaySub.customer_id,
      amount: amount != null ? amount : 0,
      status: razorpaySub.status || "created",
      totalCount: razorpaySub.total_count || totalCount || DEFAULT_TOTAL_CYCLES,
      currentPeriodStart: toDate(razorpaySub.current_start),
      currentPeriodEnd: toDate(razorpaySub.current_end),
      nextBillingDate: toDate(razorpaySub.current_end),
      notes,
      createdBy: req.user.id,
    });

    return res.status(201).json({ data: subscription });
  } catch (error) {
    console.error("Error creating client subscription:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
};

// ─── Admin: List/search/filter all client subscriptions ────────────────────
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { search, status, skip = 0, limit = 20 } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;

    if (search) {
      const matchingClients = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      filter.$or = [
        { clientId: { $in: matchingClients.map((c) => c._id) } },
        { planName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await ClientSubscription.countDocuments(filter);
    const subscriptions = await ClientSubscription.find(filter)
      .populate("clientId", "name email")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json({
      data: subscriptions,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
};

// ─── Admin: Get one subscription (with payment history) ────────────────────
exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await ClientSubscription.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("clientId", "name email phone");

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const history = await SubscriptionPaymentHistory.find({
      subscriptionId: subscription._id,
    }).sort({ createdAt: -1 });

    res.json({ data: subscription, history });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
};

// ─── Admin: Pause a subscription ────────────────────────────────────────────
exports.pauseSubscription = async (req, res) => {
  try {
    const subscription = await ClientSubscription.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const razorpaySub = await razorpay.subscriptions.pause(
      subscription.razorpaySubscriptionId,
      { pause_at: "now" }
    );

    subscription.status = razorpaySub.status || "paused";
    await subscription.save();

    res.json({ data: subscription });
  } catch (error) {
    console.error("Error pausing subscription:", error);
    res.status(500).json({ error: "Failed to pause subscription" });
  }
};

// ─── Admin: Resume a paused subscription ────────────────────────────────────
exports.resumeSubscription = async (req, res) => {
  try {
    const subscription = await ClientSubscription.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const razorpaySub = await razorpay.subscriptions.resume(
      subscription.razorpaySubscriptionId,
      { resume_at: "now" }
    );

    subscription.status = razorpaySub.status || "active";
    await subscription.save();

    res.json({ data: subscription });
  } catch (error) {
    console.error("Error resuming subscription:", error);
    res.status(500).json({ error: "Failed to resume subscription" });
  }
};

// ─── Admin: Cancel a subscription ───────────────────────────────────────────
exports.cancelSubscription = async (req, res) => {
  try {
    const { cancelAtCycleEnd } = req.body;

    const subscription = await ClientSubscription.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const razorpaySub = await razorpay.subscriptions.cancel(
      subscription.razorpaySubscriptionId,
      Boolean(cancelAtCycleEnd)
    );

    subscription.status = razorpaySub.status || "cancelled";
    await subscription.save();

    res.json({ data: subscription });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
};

// ─── Admin: Payment history across all clients (with filters) ──────────────
exports.getAllPaymentHistory = async (req, res) => {
  try {
    const { subscriptionId, clientId, status, search, skip = 0, limit = 20 } = req.query;

    const filter = {};
    if (subscriptionId) filter.subscriptionId = subscriptionId;
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;
    if (search) {
      const matchingClients = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      filter.clientId = { $in: matchingClients.map((client) => client._id) };
    }

    const total = await SubscriptionPaymentHistory.countDocuments(filter);
    const history = await SubscriptionPaymentHistory.find(filter)
      .populate("clientId", "name email")
      .populate("subscriptionId", "planName razorpaySubscriptionId")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json({ data: history, total, skip: parseInt(skip), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
};

// ─── Admin: Live one-time transactions from Razorpay Payment Links ─────────
exports.getPaymentLinkTransactions = (req, res) =>
  loadPaymentLinkTransactions(req, res, true);

exports.getMyPaymentLinkTransactions = (req, res) =>
  loadPaymentLinkTransactions(req, res, false);

async function loadPaymentLinkTransactions(req, res, isAdmin) {
  try {
    const { search, skip = 0, limit = 20 } = req.query;
    const clients = await User.find(
      isAdmin ? { role: "client" } : { _id: req.user.id, role: "client" }
    ).select("name email phone");
    if (!isAdmin && clients.length === 0) {
      return res.status(403).json({ error: "Client account required" });
    }
    const clientsById = new Map(clients.map((client) => [client._id.toString(), client]));
    const clientsByEmail = new Map(
      clients.map((client) => [client.email.trim().toLowerCase(), client])
    );
    const clientsByPhone = new Map(
      clients
        .filter((client) => client.phone)
        .map((client) => [String(client.phone).replace(/\D/g, "").slice(-10), client])
    );

    const links = [];
    const pageSize = 100;
    let linkSkip = 0;
    while (true) {
      const response = await razorpay.paymentLink.all({ count: pageSize, skip: linkSkip });
      const page = response.payment_links || response.items || [];
      links.push(...page);
      if (page.length < pageSize) break;
      linkSkip += pageSize;
    }

    const resolvedLinks = [];
    for (let index = 0; index < links.length; index += 10) {
      const batch = await Promise.all(
        links.slice(index, index + 10).map(async (link) => {
        let payments = Array.isArray(link.payments)
          ? link.payments
          : link.payments?.items || (link.payments ? [link.payments] : []);

        if (
          payments.length === 0 &&
          ["paid", "partially_paid"].includes(link.status) &&
          Number(link.amount_paid) > 0
        ) {
          try {
            const details = await razorpay.paymentLink.fetch(link.id);
            payments = Array.isArray(details.payments)
              ? details.payments
              : details.payments?.items || (details.payments ? [details.payments] : []);
          } catch (error) {
            console.error(`Failed to fetch Razorpay Payment Link ${link.id}:`, error.message);
          }
        }

        return { link, payments };
        })
      );
      resolvedLinks.push(...batch);
    }

    const query = isAdmin ? search?.trim().toLowerCase() : null;
    const transactions = [];
    for (const { link, payments } of resolvedLinks) {
      const notesClientId = link.notes?.clientId || link.notes?.client_id;
      const customerDetails = link.customer_details || link.customer || {};
      const customerEmail = String(
        customerDetails.email || link.email || link.notes?.email || ""
      ).trim().toLowerCase();
      const customerPhone = String(
        customerDetails.contact || customerDetails.phone || link.contact || ""
      ).replace(/\D/g, "").slice(-10);
      const client =
        clientsById.get(String(notesClientId)) ||
        clientsByEmail.get(customerEmail) ||
        clientsByPhone.get(customerPhone);

      if (!client || (query && !`${client.name} ${client.email}`.toLowerCase().includes(query))) continue;

      for (const payment of payments) {
        const razorpayPaymentId = payment.payment_id || payment.id;
        if (!razorpayPaymentId) continue;
        const createdAt = Number(payment.created_at);
        transactions.push({
          _id: razorpayPaymentId,
          clientId: { _id: client._id, name: client.name, email: client.email },
          razorpayPaymentId,
          razorpayPaymentLinkId: link.id,
          razorpayInvoiceId: link.reference_id,
          amount: Number(payment.amount || 0) / 100,
          currency: payment.currency || link.currency || "INR",
          status: payment.status || (link.status === "paid" ? "captured" : link.status),
          method: payment.method,
          occurredAt: Number.isFinite(createdAt)
            ? new Date(createdAt * 1000)
            : payment.created_at || link.created_at,
          failureReason: payment.error_description || payment.error_reason,
          eventType: "payment_link",
          description: link.description,
        });
      }
    }

    transactions.sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));
    const start = Math.max(0, parseInt(skip, 10) || 0);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    res.json({
      data: transactions.slice(start, start + pageLimit),
      total: transactions.length,
      skip: start,
      limit: pageLimit,
    });
  } catch (error) {
    console.error("Error fetching Razorpay Payment Link transactions:", error);
    res.status(500).json({ error: "Failed to fetch Razorpay Payment Link transactions" });
  }
}

// ─── Client: Get own subscriptions (all of them) ────────────────────────────
exports.getMySubscription = async (req, res) => {
  try {
    const subscriptions = await ClientSubscription.find({
      clientId: req.user.id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.json({ data: subscriptions });
  } catch (error) {
    console.error("Error fetching my subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
};

// ─── Client: Get own payment history ────────────────────────────────────────
exports.getMyPaymentHistory = async (req, res) => {
  try {
    const { skip = 0, limit = 20 } = req.query;

    const filter = { clientId: req.user.id };
    const total = await SubscriptionPaymentHistory.countDocuments(filter);
    const history = await SubscriptionPaymentHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json({ data: history, total, skip: parseInt(skip), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching my payment history:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
};

// ─── Client: Verify checkout after authorizing the mandate ─────────────────
// Used only when a subscription is still "created"/"pending" and the client
// needs to authorize their card via Razorpay Checkout. Status is always
// re-fetched from Razorpay (never trusted from the request body).
exports.verifyMySubscription = async (req, res) => {
  try {
    const {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
    } = req.body;

    if (!paymentId || !subscriptionId || !signature) {
      return res.status(400).json({ error: "Missing Razorpay verification fields" });
    }

    const subscription = await ClientSubscription.findOne({
      clientId: req.user.id,
      razorpaySubscriptionId: subscriptionId,
      isDeleted: false,
    });
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    const isValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isValid) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const razorpaySub = await razorpay.subscriptions.fetch(subscriptionId);
    subscription.status = razorpaySub.status;
    subscription.lastPaymentId = paymentId;
    subscription.lastPaymentStatus = "captured";
    subscription.lastPaymentAt = new Date();
    if (razorpaySub.current_start) subscription.currentPeriodStart = toDate(razorpaySub.current_start);
    if (razorpaySub.current_end) {
      subscription.currentPeriodEnd = toDate(razorpaySub.current_end);
      subscription.nextBillingDate = toDate(razorpaySub.current_end);
    }
    await subscription.save();

    // Record this payment in history immediately (don't rely solely on the
    // webhook, which may not be configured yet / may arrive later).
    try {
      const existingRecord = await SubscriptionPaymentHistory.findOne({ razorpayPaymentId: paymentId });
      if (!existingRecord) {
        const paymentDetails = await razorpay.payments.fetch(paymentId);
        await SubscriptionPaymentHistory.create({
          subscriptionId: subscription._id,
          clientId: subscription.clientId,
          razorpayPaymentId: paymentId,
          amount: (paymentDetails.amount || 0) / 100,
          currency: paymentDetails.currency || "INR",
          status: "captured",
          method: paymentDetails.method,
          eventType: "checkout.verify",
          occurredAt: new Date((paymentDetails.created_at || Date.now() / 1000) * 1000),
        });
      }
    } catch (historyError) {
      console.error("Error recording payment history from checkout verify:", historyError);
    }

    res.json({ data: subscription });
  } catch (error) {
    console.error("Error verifying client subscription:", error);
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

// ─── Webhook: Razorpay subscription/payment lifecycle events ───────────────
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }
    if (!signature || !req.rawBody) {
      return res.status(400).json({ error: "Missing signature or raw body" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

    const isValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    const eventId = event.id || `${event.event}-${event.created_at}`;
    const subscriptionEntity = event.payload?.subscription?.entity;
    const paymentEntity = event.payload?.payment?.entity;

    if (!subscriptionEntity?.id) {
      // Not a subscription-related event (e.g. plain order payment) — skip.
      return res.status(200).json({ received: true });
    }

    const subscription = await ClientSubscription.findOne({
      razorpaySubscriptionId: subscriptionEntity.id,
      isDeleted: false,
    });

    if (!subscription) {
      // Not a subscription created by this feature — acknowledge and skip.
      return res.status(200).json({ received: true });
    }

    if (subscription.processedEventIds.includes(eventId)) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    switch (event.event) {
      case "subscription.authenticated":
        subscription.status = "authenticated";
        break;
      case "subscription.activated":
        subscription.status = "active";
        break;
      case "subscription.charged":
        subscription.status = "active";
        if (paymentEntity?.id) {
          subscription.lastPaymentId = paymentEntity.id;
          subscription.lastPaymentStatus = "captured";
          subscription.lastPaymentAt = new Date();
        }
        break;
      case "subscription.pending":
        subscription.status = "pending";
        break;
      case "subscription.halted":
        subscription.status = "halted";
        break;
      case "subscription.paused":
        subscription.status = "paused";
        break;
      case "subscription.resumed":
        subscription.status = "active";
        break;
      case "subscription.cancelled":
        subscription.status = "cancelled";
        break;
      case "subscription.completed":
        subscription.status = "completed";
        break;
      case "subscription.expired":
        subscription.status = "expired";
        break;
      case "payment.failed":
        subscription.lastPaymentStatus = "failed";
        subscription.lastPaymentAt = new Date();
        break;
      default:
        break;
    }

    if (subscriptionEntity.current_start) {
      subscription.currentPeriodStart = toDate(subscriptionEntity.current_start);
    }
    if (subscriptionEntity.current_end) {
      subscription.currentPeriodEnd = toDate(subscriptionEntity.current_end);
      subscription.nextBillingDate = toDate(subscriptionEntity.current_end);
    }

    // Record a payment history entry for charge success/failure events.
    if (event.event === "subscription.charged" && paymentEntity) {
      await SubscriptionPaymentHistory.create({
        subscriptionId: subscription._id,
        clientId: subscription.clientId,
        razorpayPaymentId: paymentEntity.id,
        razorpayInvoiceId: event.payload?.invoice?.entity?.id,
        amount: (paymentEntity.amount || 0) / 100,
        currency: paymentEntity.currency || "INR",
        status: "captured",
        method: paymentEntity.method,
        eventType: event.event,
        occurredAt: new Date((event.created_at || Date.now() / 1000) * 1000),
      });
    } else if (event.event === "payment.failed" && paymentEntity) {
      await SubscriptionPaymentHistory.create({
        subscriptionId: subscription._id,
        clientId: subscription.clientId,
        razorpayPaymentId: paymentEntity.id,
        amount: (paymentEntity.amount || 0) / 100,
        currency: paymentEntity.currency || "INR",
        status: "failed",
        method: paymentEntity.method,
        failureReason: paymentEntity.error_description || paymentEntity.error_reason,
        eventType: event.event,
        occurredAt: new Date((event.created_at || Date.now() / 1000) * 1000),
      });
    }

    subscription.processedEventIds.push(eventId);
    if (subscription.processedEventIds.length > 200) {
      subscription.processedEventIds = subscription.processedEventIds.slice(-200);
    }

    await subscription.save();

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error handling client subscription webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
