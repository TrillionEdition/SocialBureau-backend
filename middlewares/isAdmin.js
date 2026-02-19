module.exports = function isAdmin(req, res, next) {
    console.log("Checking admin role for user:", req.user?.email, "Role:", req.user?.role);

    if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
        return next();
    }

    return res.status(403).json({
        message: 'Access denied. Admins only.'
    });
};
