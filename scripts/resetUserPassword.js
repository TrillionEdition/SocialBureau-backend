/**
 * Admin utility: manually reset a user's password directly in MongoDB.
 *
 * Generates a cryptographically random temporary password, hashes it with
 * bcryptjs (same as userController), and updates the user's record. Prints
 * the plaintext temp password once so it can be relayed to the client
 * through another channel (phone, WhatsApp, etc.) — it is never stored.
 *
 * Usage:
 *   node backend/scripts/resetUserPassword.js <email>
 *   node backend/scripts/resetUserPassword.js <email> --password="SomeTempPass123!"
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

function parseArgs(argv) {
  const email = argv[2];
  const passwordArg = argv.find((a) => a.startsWith("--password="));
  const password = passwordArg ? passwordArg.split("=").slice(1).join("=") : null;
  return { email, password };
}

function generateTempPassword() {
  // 12 random bytes -> base64url, trimmed to 16 chars, plus a guaranteed digit/symbol for complexity
  const raw = crypto.randomBytes(12).toString("base64url");
  return `${raw}!9`;
}

async function main() {
  const { email, password } = parseArgs(process.argv);

  if (!email) {
    console.error("❌ Usage: node backend/scripts/resetUserPassword.js <email> [--password=\"NewTempPass\"]");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set in backend/.env");
    process.exit(1);
  }

  const tempPassword = password || generateTempPassword();

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to DB");

  try {
    const User = require("../models/userModel");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log("\n✅ Password reset successfully");
    console.log(`   User:  ${user.email} (${user._id})`);
    console.log(`   Temp password: ${tempPassword}`);
    console.log("\n⚠️  Share this temp password with the client over a secure channel");
    console.log("   (phone, WhatsApp, etc.) — NOT the compromised email — and ask them");
    console.log("   to change it immediately after logging in.\n");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Error resetting password:", err);
  process.exit(1);
});
