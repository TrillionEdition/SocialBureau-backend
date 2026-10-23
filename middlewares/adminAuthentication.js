/**
 * Middleware to restrict access to admin users only.
 * Must be used AFTER userAuthentication middleware.
 */
const adminAuthentication = (req, res, next) => {
  const role = req.user && req.user.role ? req.user.role.toLowerCase() : null;
  if (role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admin role required." });
};

module.exports = adminAuthentication;
