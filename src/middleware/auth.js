const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT Token
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan. Silakan login terlebih dahulu.'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Check if user still exists
            const users = await query(
                'SELECT id_user, username, nama_lengkap, email, role FROM tbl_user WHERE id_user = ?',
                [decoded.id]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User tidak ditemukan.'
                });
            }

            req.user = users[0];
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token telah kadaluarsa. Silakan login kembali.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid.'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

// Check Role
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Dibutuhkan role: ${roles.join(' atau ')}`
            });
        }

        next();
    };
};

// Check if user is admin or superadmin
const isAdmin = checkRole(['admin', 'superadmin']);

// Check if user is superadmin only
const isSuperAdmin = checkRole(['superadmin']);

// Check if user is at least user
const isUser = checkRole(['user', 'admin', 'superadmin']);

module.exports = { verifyToken, checkRole, isAdmin, isSuperAdmin, isUser };