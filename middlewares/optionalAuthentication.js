const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Optional Authentication Middleware
 * Attaches user to req.user if token is valid, but doesn't block request if missing.
 */
const optionalAuthentication = (req, res, next) => {
    const tokenFromCookie = req.cookies && req.cookies.token;
    const authHeader = req.headers && req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = {
            email: decoded.email,
            id: decoded.id,
            name: decoded.name,
            role: decoded.role,
        };
        next();
    } catch (err) {
        req.user = null;
        next();
    }
};

module.exports = optionalAuthentication;
