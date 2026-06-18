const cron = require("node-cron");
const { syncFifaMatches } = require("../services/fifaSyncService");

console.log("🗓️ Scheduling FIFA World Cup matches background sync cron (every 15 minutes)...");

// Run sync on startup (wait 5s for MongoDB connection to stabilize)
setTimeout(async () => {
  console.log("⏰ Running initial FIFA World Cup matches sync on server startup...");
  try {
    await syncFifaMatches();
  } catch (err) {
    console.error("❌ FIFA startup sync error:", err.message);
  }
}, 5000);

// Run every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  console.log("⏰ Running periodic FIFA matches database sync...");
  try {
    await syncFifaMatches();
  } catch (err) {
    console.error("❌ FIFA periodic sync cron error:", err.message);
  }
});
