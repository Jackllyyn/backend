const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

class AuthController {
    // Login
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username dan password wajib diisi'
                });
            }

            // Get user from database
            const users = await query(
                'SELECT id_user, username, password, nama_lengkap, email, role FROM tbl_user WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Username atau password salah'
                });
            }

            const user = users[0];

            // Check password with bcrypt
            let isValid = false;
            try {
                isValid = await bcrypt.compare(password, user.password);
            } catch (e) {
                isValid = false;
            }

            // Check with MD5 (for backward compatibility)
            if (!isValid) {
                const md5 = require('crypto').createHash('md5').update(password).digest('hex');
                if (user.password === md5) {
                    isValid = true;
                    // Upgrade to bcrypt
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await query(
                        'UPDATE tbl_user SET password = ? WHERE id_user = ?',
                        [hashedPassword, user.id_user]
                    );
                }
            }

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Username atau password salah'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id_user,
                    username: user.username,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRE }
            );

            // Remove password from response
            delete user.password;

            res.json({
                success: true,
                message: 'Login berhasil',
                data: {
                    user,
                    token,
                    expiresIn: JWT_EXPIRE
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }

    // Register
    static async register(req, res) {
        try {
            const { username, password, nama_lengkap, email, role } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username dan password wajib diisi'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password minimal 6 karakter'
                });
            }

            // Check if username already exists
            const existing = await query(
                'SELECT id_user FROM tbl_user WHERE username = ?',
                [username]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username sudah digunakan'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const result = await query(
                `INSERT INTO tbl_user (username, password, nama_lengkap, email, role) 
                 VALUES (?, ?, ?, ?, ?)`,
                [username, hashedPassword, nama_lengkap || null, email || null, role || 'user']
            );

            const newUser = {
                id_user: result.insertId,
                username,
                nama_lengkap: nama_lengkap || null,
                email: email || null,
                role: role || 'user'
            };

            res.status(201).json({
                success: true,
                message: 'User berhasil dibuat',
                data: newUser
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }

    // Get Current User
    static async getMe(req, res) {
        try {
            const user = req.user;
            delete user.password;

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Get me error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }

    // Logout
    static async logout(req, res) {
        res.json({
            success: true,
            message: 'Logout berhasil'
        });
    }

    // Change Password
    static async changePassword(req, res) {
        try {
            const { old_password, new_password } = req.body;
            const userId = req.user.id_user;

            if (!old_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password lama dan baru wajib diisi'
                });
            }

            if (new_password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password baru minimal 6 karakter'
                });
            }

            // Get user password
            const users = await query(
                'SELECT password FROM tbl_user WHERE id_user = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }

            const user = users[0];

            // Verify old password
            let isValid = await bcrypt.compare(old_password, user.password);
            
            // Check MD5
            if (!isValid) {
                const md5 = require('crypto').createHash('md5').update(old_password).digest('hex');
                if (user.password === md5) {
                    isValid = true;
                }
            }

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Password lama salah'
                });
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 10);

            // Update password
            await query(
                'UPDATE tbl_user SET password = ? WHERE id_user = ?',
                [hashedNewPassword, userId]
            );

            res.json({
                success: true,
                message: 'Password berhasil diubah'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }

    // Get All Users (Admin only)
    static async getAllUsers(req, res) {
        try {
            const users = await query(
                'SELECT id_user, username, nama_lengkap, email, role, created_at FROM tbl_user'
            );

            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }

    // Update User (Admin only)
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { nama_lengkap, email, role } = req.body;

            // Check if user exists
            const users = await query(
                'SELECT id_user, role FROM tbl_user WHERE id_user = ?',
                [id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }

            const user = users[0];

            // Prevent changing own role if not superadmin
            if (req.user.id_user === parseInt(id) && role && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Anda tidak dapat mengubah role sendiri'
                });
            }

            // Build update query
            const updates = [];
            const values = [];

            if (nama_lengkap !== undefined) {
                updates.push('nama_lengkap = ?');
                values.push(nama_lengkap);
            }

            if (email !== undefined) {
                updates.push('email = ?');
                values.push(email);
            }

            if (role !== undefined && req.user.role === 'superadmin') {
                updates.push('role = ?');
                values.push(role);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada data yang diupdate'
                });
            }

            values.push(id);

            await query(
                `UPDATE tbl_user SET ${updates.join(', ')} WHERE id_user = ?`,
                values
            );

            // Get updated user
            const updatedUsers = await query(
                'SELECT id_user, username, nama_lengkap, email, role FROM tbl_user WHERE id_user = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'User berhasil diupdate',
                data: updatedUsers[0]
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }

    // Delete User (SuperAdmin only)
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Prevent deleting self
            if (req.user.id_user === parseInt(id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Anda tidak dapat menghapus akun sendiri'
                });
            }

            // Check if user exists
            const users = await query(
                'SELECT id_user FROM tbl_user WHERE id_user = ?',
                [id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }

            await query(
                'DELETE FROM tbl_user WHERE id_user = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'User berhasil dihapus'
            });

        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan pada server'
            });
        }
    }
}

module.exports = AuthController;