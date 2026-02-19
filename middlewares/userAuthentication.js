const jwt = require("jsonwebtoken");
require("dotenv").config();

const userAuthentication = (req, res, next) => {
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
        req.user = {
            email: decoded.email,
            id: decoded.id,
            name: decoded.name,
            role: decoded.role,
        };
        return next();
    } catch (err) {
        if (err && err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'jwt expired' });
        }
        return res.status(401).json({ message: 'User not authenticated' });
    }
};

module.exports = userAuthentication;