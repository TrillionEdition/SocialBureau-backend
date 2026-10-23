const User = require("../models/userModel");

async function getCurrentRole(userId, tokenRole) {
  if (typeof tokenRole !== "string" || tokenRole.toLowerCase() !== "admin") {
    return tokenRole || "user";
  }

  const user = await User.findById(userId).select("role").lean();
  return user?.role || null;
}

module.exports = { getCurrentRole };
