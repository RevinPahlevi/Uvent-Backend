const jwt = require('jsonwebtoken');

// Middleware untuk verifikasi JWT token
function authenticateToken(req, res, next) {
    // Get token dari header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    // Jika tidak ada token
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Access token required'
        });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_this_in_production_12345', (err, user) => {
        if (err) {
            return res.status(403).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }

        // Token valid, attach user info ke request
        req.user = user;
        next();
    });
}

module.exports = {
    authenticateToken
};
