const jwt = require("jsonwebtoken");
const { getCurrentRole } = require("../utils/currentUserRole");
require("dotenv").config();

/**
 * Optional Authentication Middleware
 * Attaches user to req.user if token is valid, but doesn't block request if missing.
 */
const optionalAuthentication = async (req, res, next) => {
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
        const role = await getCurrentRole(decoded.id, decoded.role);
        if (!role) {
            req.user = null;
            return next();
        }
        req.user = {
            email: decoded.email,
            id: decoded.id,
            name: decoded.name,
            role,
        };
        return next();
    } catch (err) {
        if (err && err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError" && err.name !== "NotBeforeError") {
            return next(err);
        }
        req.user = null;
        return next();
    }
};

module.exports = optionalAuthentication;
