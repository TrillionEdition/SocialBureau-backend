module.exports = function isAdmin(req, res, next) {
    const role = req.user?.role?.toLowerCase();
    if (req.user && role === 'admin') {
        return next();
    }

    return res.status(403).json({
        message: 'Access denied. Authorized staff only.'
    });
};
