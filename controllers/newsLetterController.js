const Subscriber = require("../models/Subscriber");

const sendMail = require("../utils/sendMail");
const blogJobTemplate = require("../utils/blogEmailTemplate");

const { getLatestPublishedBlog, getLatestActiveJob } = require("../services/blogService");

exports.sendLatestBlogNewsletter = async () => {
  console.log("🔔 Newsletter job+blog started");

  const blog = await getLatestPublishedBlog();
  if (!blog) {
    console.log("No published blog found, aborting");
    return;
  }

  const job = await getLatestActiveJob();

  // Check removed: Always send latest blog/job regardless of previous history


  const subscribers = await Subscriber.find({ isActive: true });

  if (!subscribers.length) {
    console.log("No active subscribers found");
    return;
  }

  console.log(`📬 Sending newsletter to ${subscribers.length} subscribers...`);

  let successCount = 0;
  let failureCount = 0;

  for (const user of subscribers) {
    try {
      await sendMail({
        to: user.email,
        subject: `📰 ${blog.title}${job ? " + Latest Job Opening" : ""}`,
        html: blogJobTemplate({ blog, job }),
      });
      successCount++;
      console.log(`✅ Sent to ${user.email}`);
    } catch (err) {
      failureCount++;
      console.error(`❌ Failed to send to ${user.email}:`, err.message || err);
    }
  }

  console.log(
    `📊 Newsletter delivery: ${successCount} sent, ${failureCount} failed`
  );

  // State update removed


  // console.log("✅ Newsletter completed");
};

exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const subscriber = await Subscriber.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        isActive: true,
        subscribedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const blog = await getLatestPublishedBlog();
    const job = await getLatestActiveJob();

    if (blog) {
      try {
        await sendMail({
          to: subscriber.email,
          subject: `Welcome! Read our latest blog: ${blog.title}`,
          html: blogJobTemplate({ blog, job }),
        });
        // console.log(`✅ Welcome email sent to ${subscriber.email}`);
      } catch (err) {
        console.error(
          `⚠️ Welcome email failed for ${subscriber.email}:`,
          err.message
        );
        // Don't fail the subscription if welcome email fails
      }
    }

    res.json({
      success: true,
      message: "Subscribed successfully",
      data: {
        email: subscriber.email,
        isActive: subscriber.isActive,
      },
    });
  } catch (err) {
    console.error("Subscribe error:", err.message);
    res.status(500).json({ message: "Subscription failed" });
  }
};

exports.sendTestNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const blog = await getLatestPublishedBlog();
    if (!blog) {
      return res.status(404).json({ message: "No published blog found" });
    }

    const job = await getLatestActiveJob();

    await sendMail({
      to: email,
      subject: `🧪 TEST: ${blog.title}`,
      html: blogJobTemplate({ blog, job }),
    });

    console.log(`✅ Test email sent to ${email}`);
    res.json({
      success: true,
      message: "Test email sent successfully",
      blog: { title: blog.title, slug: blog.slug },
    });
  } catch (err) {
    console.error("❌ Test email failed:", err.message);
    res.status(500).json({ message: "Test email failed: " + err.message });
  }
};

exports.getSubscriberCount = async (req, res) => {
  try {
    const totalSubscribers = await Subscriber.countDocuments();
    const activeSubscribers = await Subscriber.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        total: totalSubscribers,
        active: activeSubscribers,
        inactive: totalSubscribers - activeSubscribers,
      },
    });
  } catch (err) {
    console.error("Error getting subscriber count:", err.message);
    res.status(500).json({ message: "Failed to fetch subscriber count" });
  }
};

exports.unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const subscriber = await Subscriber.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { isActive: false, unsubscribedAt: new Date() },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }

    res.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (err) {
    console.error("Unsubscribe error:", err.message);
    res.status(500).json({ message: "Unsubscribe failed" });
  }
};