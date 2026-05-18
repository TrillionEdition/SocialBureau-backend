module.exports = function isAdmin(req, res, next) {
    console.log("Checking staff role for user:", req.user?.email, "Role:", req.user?.role);

    const role = req.user?.role?.toLowerCase();
    if (req.user && role === 'admin') {
        return next();
    }

    return res.status(403).json({
        message: 'Access denied. Authorized staff only.'
    });
};
