const cron = require("node-cron");
const Billing = require("../models/BillingModel");
const {
  sendPaymentReminderEmail,
  sendPaymentOverdueEmail,
} = require("../services/billingEmailService");

/**
 * Schedule payment reminders - runs daily at 9 AM
 * Sends reminder 3 days before due date
 */
const schedulePaymentReminders = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running payment reminder cron...");

    try {
      const now = new Date();
      const reminderDate = new Date(now);
      reminderDate.setDate(reminderDate.getDate() + 3);

      // Set time to end of day for the due date comparison
      const endOfDay = new Date(reminderDate);
      endOfDay.setHours(23, 59, 59, 999);

      const startOfDay = new Date(reminderDate);
      startOfDay.setHours(0, 0, 0, 0);

      // Find pending payments due in 3 days that haven't sent reminders
      const paymentsDue = await Billing.find({
        status: "pending",
        dueDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        reminderSent: false,
        isDeleted: false,
      }).populate("clientId");

      console.log(`Found ${paymentsDue.length} payments for reminders`);

      for (const payment of paymentsDue) {
        try {
          const daysLeft = Math.ceil((payment.dueDate - now) / (1000 * 60 * 60 * 24));

          await sendPaymentReminderEmail({
            clientEmail: payment.clientId.email,
            clientName: payment.clientId.name,
            payment: payment.toObject(),
            daysLeft,
          });

          // Mark as sent
          payment.reminderSent = true;
          await payment.save();

          console.log(`Reminder sent for billing ${payment._id}`);
        } catch (error) {
          console.error(`Error sending reminder for billing ${payment._id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in payment reminder cron:", error);
    }
  });
};

/**
 * Schedule overdue reminders - runs daily at 10 AM
 * Sends overdue notice for payments past due date
 */
const scheduleOverdueReminders = () => {
  cron.schedule("0 10 * * *", async () => {
    console.log("Running overdue payment cron...");

    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      // Find overdue payments that haven't sent overdue notification
      const overduePayments = await Billing.find({
        status: "pending",
        dueDate: {
          $lt: startOfToday,
        },
        overdueSent: false,
        isDeleted: false,
      }).populate("clientId");

      console.log(`Found ${overduePayments.length} overdue payments`);

      for (const payment of overduePayments) {
        try {
          const daysOverdue = Math.ceil((now - payment.dueDate) / (1000 * 60 * 60 * 24));

          await sendPaymentOverdueEmail({
            clientEmail: payment.clientId.email,
            clientName: payment.clientId.name,
            payment: payment.toObject(),
            daysOverdue,
          });

          // Mark as sent
          payment.overdueSent = true;
          await payment.save();

          console.log(`Overdue notification sent for billing ${payment._id}`);
        } catch (error) {
          console.error(`Error sending overdue notification for billing ${payment._id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in overdue payment cron:", error);
    }
  });
};

/**
 * Auto-update payment status to overdue - runs daily at 8 AM
 * Updates pending payments that are past due date
 */
const scheduleStatusUpdate = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("Running payment status update cron...");

    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      // Update pending payments to overdue if past due date
      const result = await Billing.updateMany(
        {
          status: "pending",
          dueDate: {
            $lt: startOfToday,
          },
          isDeleted: false,
        },
        {
          status: "overdue",
        }
      );

      console.log(`Updated ${result.modifiedCount} payments to overdue status`);
    } catch (error) {
      console.error("Error in payment status update cron:", error);
    }
  });
};

// Initialize all crons
const initializeBillingCrons = () => {
  scheduleStatusUpdate();
  schedulePaymentReminders();
  scheduleOverdueReminders();
};

module.exports = {
  initializeBillingCrons,
};
