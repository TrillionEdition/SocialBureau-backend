const jwt = require("jsonwebtoken");
const { getCurrentRole } = require("../utils/currentUserRole");
require("dotenv").config();

const userAuthentication = async (req, res, next) => {
    const tokenFromCookie = req.cookies && req.cookies.token;
    const authHeader = req.headers && req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
        return res.status(401).json({ message: "User not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const role = await getCurrentRole(decoded.id, decoded.role);
        if (!role) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        req.user = {
            email: decoded.email,
            id: decoded.id,
            name: decoded.name,
            role,
            verification: decoded.verification,
        };
        return next();
    } catch (err) {
        if (err && err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError" && err.name !== "NotBeforeError") {
            return next(err);
        }
        if (err && err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Please log in again' });
        }
        return res.status(401).json({ message: 'User not authenticated' });
    }
};

module.exports = userAuthentication;