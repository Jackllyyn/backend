const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// ============================================================
// CORS - IZINKAN SEMUA
// ============================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.status(200).end();
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url}`);
    next();
});

// ============================================================
// DATABASE CONNECTION
// ============================================================
console.log('📊 ===== ENVIRONMENT VARIABLES =====');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('=====================================');

let db;

if (process.env.MYSQL_URL) {
    console.log('🔄 Menggunakan MYSQL_URL...');
    db = mysql.createPool(process.env.MYSQL_URL);
} else if (process.env.MYSQL_PUBLIC_URL) {
    console.log('🔄 Menggunakan MYSQL_PUBLIC_URL...');
    db = mysql.createPool(process.env.MYSQL_PUBLIC_URL);
} else {
    console.log('🔄 Menggunakan konfigurasi manual...');
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway',
        port: parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 60000,
        ssl: {
            rejectUnauthorized: false
        }
    };
    db = mysql.createPool(dbConfig);
}

(async () => {
    try {
        console.log('🔄 Mencoba koneksi ke database...');
        const [rows] = await db.query('SELECT 1 as connected');
        console.log('✅ Database terhubung!');
    } catch (err) {
        console.error('❌ Gagal koneksi ke database!');
        console.error('   Error:', err.message);
        process.exit(1);
    }
})();

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan. Silakan login terlebih dahulu.',
                code: 'TOKEN_NOT_FOUND'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            const [users] = await db.query(
                'SELECT id_user, username, nama_lengkap, email, role FROM tbl_user WHERE id_user = ?',
                [decoded.id]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User tidak ditemukan.',
                    code: 'USER_NOT_FOUND'
                });
            }

            req.user = users[0];
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token telah kadaluarsa. Silakan login kembali.',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token tidak valid.',
                    code: 'INVALID_TOKEN'
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya admin yang dapat mengakses.',
            code: 'FORBIDDEN'
        });
    }

    next();
};

const isUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
        });
    }

    if (req.user.role !== 'user' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak.',
            code: 'FORBIDDEN'
        });
    }

    next();
};

// ============================================================
// ROUTE UTAMA
// ============================================================
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            success: true,
            status: 'OK',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            status: 'ERROR',
            database: 'Disconnected',
            error: err.message
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 SPK AHP Perpustakaan Kab. Brebes',
        version: '1.0.0',
        status: 'Running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 as status');
        res.json({
            success: true,
            message: '✅ API SPK AHP Berjalan!',
            database: 'Terhubung',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Database tidak terhubung',
            error: err.message
        });
    }
});

// ============================================================
// ROUTE AUTH
// ============================================================
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login attempt:', req.body.username || 'unknown');
    
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password wajib diisi'
            });
        }

        const [users] = await db.query(
            'SELECT id_user, username, password, nama_lengkap, email, role FROM tbl_user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            console.log('❌ User not found:', username);
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const user = users[0];

        let isValid = false;
        try {
            isValid = await bcrypt.compare(password, user.password);
        } catch (e) {
            isValid = false;
        }

        if (!isValid) {
            const md5 = require('crypto').createHash('md5').update(password).digest('hex');
            if (user.password === md5) {
                isValid = true;
                const hashedPassword = await bcrypt.hash(password, 10);
                await db.query(
                    'UPDATE tbl_user SET password = ? WHERE id_user = ?',
                    [hashedPassword, user.id_user]
                );
            }
        }

        if (!isValid) {
            console.log('❌ Invalid password for:', username);
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const token = jwt.sign(
            {
                id: user.id_user,
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        delete user.password;

        console.log('✅ Login success:', username);

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
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
});

app.post('/api/auth/register', verifyToken, isAdmin, async (req, res) => {
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

        const [existing] = await db.query(
            'SELECT id_user FROM tbl_user WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO tbl_user (username, password, nama_lengkap, email, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, nama_lengkap || null, email || null, role || 'user']
        );

        res.status(201).json({
            success: true,
            message: 'User berhasil dibuat',
            data: {
                id_user: result.insertId,
                username,
                nama_lengkap: nama_lengkap || null,
                email: email || null,
                role: role || 'user'
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    res.json({
        success: true,
        message: 'Logout berhasil'
    });
});

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
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

        const [users] = await db.query(
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

        let isValid = await bcrypt.compare(old_password, user.password);
        
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

        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        await db.query(
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
});

app.put('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const { nama_lengkap, email } = req.body;
        const userId = req.user.id_user;

        await db.query(
            'UPDATE tbl_user SET nama_lengkap = ?, email = ? WHERE id_user = ?',
            [nama_lengkap || req.user.nama_lengkap, email || req.user.email, userId]
        );

        const [users] = await db.query(
            'SELECT id_user, username, nama_lengkap, email, role FROM tbl_user WHERE id_user = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Profile berhasil diupdate',
            data: users[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/auth/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id_user, username, nama_lengkap, email, role, created_at FROM tbl_user ORDER BY id_user'
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
});

app.delete('/api/auth/users/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.id_user === parseInt(id)) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak dapat menghapus akun sendiri'
            });
        }

        const [users] = await db.query(
            'SELECT id_user FROM tbl_user WHERE id_user = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        await db.query('DELETE FROM tbl_user WHERE id_user = ?', [id]);

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
});

// ============================================================
// ROUTE KRITERIA
// ============================================================
app.get('/api/kriteria', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_kriteria ORDER BY id_kriteria');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/kriteria:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/kriteria/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM tbl_kriteria WHERE id_kriteria = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kriteria tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error GET /api/kriteria/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/kriteria', verifyToken, isAdmin, async (req, res) => {
    try {
        const { nama_kriteria, tipe = 'benefit' } = req.body;
        
        if (!nama_kriteria) {
            return res.status(400).json({ success: false, message: 'Nama kriteria wajib diisi' });
        }

        const [result] = await db.query(
            'INSERT INTO tbl_kriteria (nama_kriteria, tipe) VALUES (?, ?)',
            [nama_kriteria, tipe]
        );

        res.json({
            success: true,
            data: { id: result.insertId, nama_kriteria, tipe }
        });
    } catch (err) {
        console.error('Error POST /api/kriteria:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/kriteria/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kriteria, tipe, bobot } = req.body;

        if (!nama_kriteria) {
            return res.status(400).json({ success: false, message: 'Nama kriteria wajib diisi' });
        }

        const [result] = await db.query(
            'UPDATE tbl_kriteria SET nama_kriteria = ?, tipe = ?, bobot = ? WHERE id_kriteria = ?',
            [nama_kriteria, tipe, bobot || 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Kriteria tidak ditemukan' });
        }

        res.json({ success: true, message: 'Kriteria berhasil diupdate' });
    } catch (err) {
        console.error('Error PUT /api/kriteria/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/kriteria/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM tbl_kriteria WHERE id_kriteria = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Kriteria tidak ditemukan' });
        }

        res.json({ success: true, message: 'Kriteria berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/kriteria/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE SUB-KRITERIA
// ============================================================
app.get('/api/sub-kriteria', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT sk.*, k.nama_kriteria, k.bobot as bobot_kriteria
            FROM tbl_sub_kriteria sk
            JOIN tbl_kriteria k ON sk.id_kriteria = k.id_kriteria
            ORDER BY sk.id_kriteria, sk.id_sub
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/sub-kriteria:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/sub-kriteria/kriteria/:idKriteria', async (req, res) => {
    try {
        const { idKriteria } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM tbl_sub_kriteria WHERE id_kriteria = ? ORDER BY id_sub',
            [idKriteria]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/sub-kriteria/kriteria/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/sub-kriteria', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id_kriteria, nama_sub, bobot_sub = 0 } = req.body;

        if (!id_kriteria || !nama_sub) {
            return res.status(400).json({
                success: false,
                message: 'ID kriteria dan nama sub-kriteria wajib diisi'
            });
        }

        const [result] = await db.query(
            'INSERT INTO tbl_sub_kriteria (id_kriteria, nama_sub, bobot_sub) VALUES (?, ?, ?)',
            [id_kriteria, nama_sub, bobot_sub]
        );

        res.json({
            success: true,
            data: { id: result.insertId, id_kriteria, nama_sub, bobot_sub }
        });
    } catch (err) {
        console.error('Error POST /api/sub-kriteria:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/sub-kriteria/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_sub, bobot_sub, bobot_global } = req.body;

        const updates = [];
        const values = [];

        if (nama_sub !== undefined && nama_sub !== null) {
            updates.push('nama_sub = ?');
            values.push(nama_sub);
        }
        if (bobot_sub !== undefined && bobot_sub !== null) {
            updates.push('bobot_sub = ?');
            values.push(bobot_sub);
        }
        if (bobot_global !== undefined && bobot_global !== null) {
            updates.push('bobot_global = ?');
            values.push(bobot_global);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada field yang diupdate'
            });
        }

        values.push(id);
        const sql = `UPDATE tbl_sub_kriteria SET ${updates.join(', ')} WHERE id_sub = ?`;

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sub-kriteria tidak ditemukan' });
        }

        res.json({ success: true, message: 'Sub-kriteria berhasil diupdate' });
    } catch (err) {
        console.error('Error PUT /api/sub-kriteria/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/sub-kriteria/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM tbl_sub_kriteria WHERE id_sub = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sub-kriteria tidak ditemukan' });
        }

        res.json({ success: true, message: 'Sub-kriteria berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/sub-kriteria/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/sub-kriteria/truncate', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM tbl_sub_kriteria');
        await db.query('ALTER TABLE tbl_sub_kriteria AUTO_INCREMENT = 1');
        res.json({ success: true, message: 'Semua sub-kriteria berhasil dihapus!' });
    } catch (err) {
        console.error('Error TRUNCATE /api/sub-kriteria:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE ALTERNATIF (BUKU)
// ============================================================
app.get('/api/alternatif', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_alternatif ORDER BY id_alternatif');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/alternatif:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/alternatif/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM tbl_alternatif WHERE id_alternatif = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error GET /api/alternatif/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/alternatif', verifyToken, isAdmin, async (req, res) => {
    try {
        const { judul_buku, penulis, penerbit, tahun_terbit, stok = 0, gambar } = req.body;

        if (!judul_buku) {
            return res.status(400).json({ success: false, message: 'Judul buku wajib diisi' });
        }

        const [result] = await db.query(
            'INSERT INTO tbl_alternatif (judul_buku, penulis, penerbit, tahun_terbit, stok, gambar) VALUES (?, ?, ?, ?, ?, ?)',
            [judul_buku, penulis || null, penerbit || null, tahun_terbit || null, stok, gambar || null]
        );

        res.json({
            success: true,
            data: { 
                id: result.insertId, 
                judul_buku, 
                penulis, 
                penerbit, 
                tahun_terbit, 
                stok, 
                gambar 
            }
        });
    } catch (err) {
        console.error('Error POST /api/alternatif:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/alternatif/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { judul_buku, penulis, penerbit, tahun_terbit, stok, gambar } = req.body;

        if (!judul_buku) {
            return res.status(400).json({ success: false, message: 'Judul buku wajib diisi' });
        }

        const [result] = await db.query(
            `UPDATE tbl_alternatif 
             SET judul_buku = ?, penulis = ?, penerbit = ?, tahun_terbit = ?, stok = ?, gambar = ?
             WHERE id_alternatif = ?`,
            [judul_buku, penulis || null, penerbit || null, tahun_terbit || null, stok || 0, gambar || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
        }

        res.json({ success: true, message: 'Buku berhasil diupdate' });
    } catch (err) {
        console.error('Error PUT /api/alternatif/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/alternatif/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM tbl_alternatif WHERE id_alternatif = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
        }

        res.json({ success: true, message: 'Buku berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/alternatif/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/alternatif/delete-all', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE tbl_nilai_alternatif');
        await db.query('TRUNCATE TABLE tbl_hasil_ahp');
        await db.query('TRUNCATE TABLE tbl_peminjaman');
        await db.query('TRUNCATE TABLE tbl_rating');
        await db.query('TRUNCATE TABLE tbl_alternatif');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        
        res.json({
            success: true,
            message: 'Semua data buku dan data terkait berhasil dihapus!'
        });
    } catch (err) {
        console.error('Error:', err);
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ============================================================
// ROUTE NILAI ALTERNATIF - DIPERBAIKI
// ============================================================

// GET semua nilai alternatif
app.get('/api/nilai-alternatif', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT na.*, a.judul_buku, sk.nama_sub, k.nama_kriteria
            FROM tbl_nilai_alternatif na
            JOIN tbl_alternatif a ON na.id_alternatif = a.id_alternatif
            JOIN tbl_sub_kriteria sk ON na.id_sub = sk.id_sub
            JOIN tbl_kriteria k ON sk.id_kriteria = k.id_kriteria
            ORDER BY na.id_alternatif
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/nilai-alternatif:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET by buku - DIPERBAIKI dengan pengecekan buku
app.get('/api/nilai-alternatif/buku/:idBuku', async (req, res) => {
    try {
        const { idBuku } = req.params;
        console.log(`📊 GET nilai alternatif untuk buku ID: ${idBuku}`);
        
        // Cek apakah buku ada
        const [buku] = await db.query(
            'SELECT id_alternatif FROM tbl_alternatif WHERE id_alternatif = ?',
            [idBuku]
        );
        
        if (buku.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Buku dengan ID ${idBuku} tidak ditemukan`,
                code: 'BOOK_NOT_FOUND'
            });
        }
        
        const [rows] = await db.query(`
            SELECT na.*, sk.nama_sub, sk.id_kriteria, k.nama_kriteria
            FROM tbl_nilai_alternatif na
            JOIN tbl_sub_kriteria sk ON na.id_sub = sk.id_sub
            JOIN tbl_kriteria k ON sk.id_kriteria = k.id_kriteria
            WHERE na.id_alternatif = ?
        `, [idBuku]);
        
        console.log(`✅ Ditemukan ${rows.length} nilai untuk buku ID ${idBuku}`);
        
        res.json({ 
            success: true, 
            data: rows,
            message: rows.length === 0 ? 'Belum ada nilai untuk buku ini' : undefined
        });
    } catch (err) {
        console.error('Error GET /api/nilai-alternatif/buku/:id:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
});

// POST - Simpan nilai alternatif
app.post('/api/nilai-alternatif', verifyToken, isUser, async (req, res) => {
    try {
        const { id_alternatif, id_sub } = req.body;
        const id_user = req.user.id_user;

        if (!id_alternatif || !id_sub) {
            return res.status(400).json({
                success: false,
                message: 'ID alternatif dan ID sub-kriteria wajib diisi'
            });
        }

        const [peminjaman] = await db.query(
            `SELECT * FROM tbl_peminjaman 
             WHERE id_user = ? AND id_buku = ? AND status = 'dikembalikan'`,
            [id_user, id_alternatif]
        );

        if (peminjaman.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum meminjam buku ini atau belum dikembalikan'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM tbl_nilai_alternatif WHERE id_alternatif = ? AND id_sub = ?',
            [id_alternatif, id_sub]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE tbl_nilai_alternatif SET nilai = 1 WHERE id_alternatif = ? AND id_sub = ?',
                [id_alternatif, id_sub]
            );
            return res.json({
                success: true,
                message: 'Nilai alternatif berhasil diupdate'
            });
        }

        await db.query(
            'INSERT INTO tbl_nilai_alternatif (id_alternatif, id_sub, nilai) VALUES (?, ?, 1)',
            [id_alternatif, id_sub]
        );

        res.json({ success: true, message: 'Nilai alternatif berhasil disimpan' });
    } catch (err) {
        console.error('Error POST /api/nilai-alternatif:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE - Hapus nilai alternatif
app.delete('/api/nilai-alternatif/:id', verifyToken, isUser, async (req, res) => {
    try {
        const { id } = req.params;
        const id_user = req.user.id_user;

        const [nilai] = await db.query(
            `SELECT na.* FROM tbl_nilai_alternatif na
             WHERE na.id_nilai = ?`,
            [id]
        );

        if (nilai.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nilai tidak ditemukan'
            });
        }

        const [peminjaman] = await db.query(
            `SELECT * FROM tbl_peminjaman 
             WHERE id_user = ? AND id_buku = ? AND status = 'dikembalikan'`,
            [id_user, nilai[0].id_alternatif]
        );

        if (peminjaman.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menghapus nilai ini'
            });
        }

        await db.query('DELETE FROM tbl_nilai_alternatif WHERE id_nilai = ?', [id]);

        res.json({ success: true, message: 'Nilai alternatif berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/nilai-alternatif/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE all nilai untuk buku tertentu
app.delete('/api/nilai-alternatif/buku/:idBuku', verifyToken, isUser, async (req, res) => {
    try {
        const { idBuku } = req.params;
        const id_user = req.user.id_user;

        const [peminjaman] = await db.query(
            `SELECT * FROM tbl_peminjaman 
             WHERE id_user = ? AND id_buku = ? AND status = 'dikembalikan'`,
            [id_user, idBuku]
        );

        if (peminjaman.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menghapus nilai ini'
            });
        }

        await db.query(
            'DELETE FROM tbl_nilai_alternatif WHERE id_alternatif = ?',
            [idBuku]
        );
        
        res.json({ 
            success: true, 
            message: 'Semua nilai alternatif untuk buku berhasil dihapus' 
        });
    } catch (err) {
        console.error('Error DELETE /api/nilai-alternatif/buku/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE NILAI ALTERNATIF USER
// ============================================================
app.get('/api/nilai-alternatif-user', verifyToken, isUser, async (req, res) => {
    try {
        const userId = req.query.userId || req.user.id_user;
        const [rows] = await db.query(
            'SELECT * FROM tbl_nilai_alternatif_user WHERE id_user = ?',
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/nilai-alternatif-user', verifyToken, isUser, async (req, res) => {
    try {
        const { id_alternatif, id_sub, nilai = 1 } = req.body;
        const id_user = req.user.id_user;

        const [existing] = await db.query(
            'SELECT * FROM tbl_nilai_alternatif_user WHERE id_user = ? AND id_alternatif = ? AND id_sub = ?',
            [id_user, id_alternatif, id_sub]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE tbl_nilai_alternatif_user SET nilai = ? WHERE id_user = ? AND id_alternatif = ? AND id_sub = ?',
                [nilai, id_user, id_alternatif, id_sub]
            );
        } else {
            await db.query(
                'INSERT INTO tbl_nilai_alternatif_user (id_user, id_alternatif, id_sub, nilai) VALUES (?, ?, ?, ?)',
                [id_user, id_alternatif, id_sub, nilai]
            );
        }

        res.json({ success: true, message: 'Penilaian berhasil disimpan' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/nilai-alternatif-user/:id', verifyToken, isUser, async (req, res) => {
    try {
        const { id } = req.params;
        const id_user = req.user.id_user;

        const [existing] = await db.query(
            'SELECT * FROM tbl_nilai_alternatif_user WHERE id_nilai = ? AND id_user = ?',
            [id, id_user]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data tidak ditemukan atau bukan milik Anda'
            });
        }

        await db.query('DELETE FROM tbl_nilai_alternatif_user WHERE id_nilai = ?', [id]);

        res.json({ success: true, message: 'Penilaian berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/nilai-alternatif-user/buku/:idBuku', verifyToken, isUser, async (req, res) => {
    try {
        const { idBuku } = req.params;
        const id_user = req.user.id_user;

        await db.query(
            'DELETE FROM tbl_nilai_alternatif_user WHERE id_user = ? AND id_alternatif = ?',
            [id_user, idBuku]
        );

        res.json({ success: true, message: 'Data penilaian berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// ROUTE PAIRWISE KRITERIA
// ============================================================
app.get('/api/pairwise', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_pairwise_kriteria ORDER BY id_pairwise');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/pairwise:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/pairwise', verifyToken, isAdmin, async (req, res) => {
    try {
        const { kriteria_1, kriteria_2, nilai } = req.body;

        if (!kriteria_1 || !kriteria_2 || !nilai) {
            return res.status(400).json({
                success: false,
                message: 'Data pairwise tidak lengkap'
            });
        }

        if (nilai < 1 || nilai > 9) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 1-9'
            });
        }

        const [existing] = await db.query(
            `SELECT * FROM tbl_pairwise_kriteria 
             WHERE (kriteria_1 = ? AND kriteria_2 = ?) 
                OR (kriteria_1 = ? AND kriteria_2 = ?)`,
            [kriteria_1, kriteria_2, kriteria_2, kriteria_1]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE tbl_pairwise_kriteria 
                 SET nilai = ? 
                 WHERE (kriteria_1 = ? AND kriteria_2 = ?) 
                    OR (kriteria_1 = ? AND kriteria_2 = ?)`,
                [nilai, kriteria_1, kriteria_2, kriteria_2, kriteria_1]
            );
            res.json({ success: true, message: 'Pairwise berhasil diupdate' });
        } else {
            await db.query(
                'INSERT INTO tbl_pairwise_kriteria (kriteria_1, kriteria_2, nilai) VALUES (?, ?, ?)',
                [kriteria_1, kriteria_2, nilai]
            );
            res.json({ success: true, message: 'Pairwise berhasil disimpan' });
        }
    } catch (err) {
        console.error('Error POST /api/pairwise:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/pairwise', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM tbl_pairwise_kriteria');
        await db.query('ALTER TABLE tbl_pairwise_kriteria AUTO_INCREMENT = 1');
        res.json({ success: true, message: 'Semua pairwise berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/pairwise:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/pairwise/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM tbl_pairwise_kriteria WHERE id_pairwise = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        res.json({ success: true, message: 'Pairwise berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/pairwise/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE PAIRWISE SUB
// ============================================================
app.get('/api/pairwise-sub', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_pairwise_sub ORDER BY id_pairwise');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/pairwise-sub:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/pairwise-sub/:idKriteria', async (req, res) => {
    try {
        const { idKriteria } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM tbl_pairwise_sub WHERE id_kriteria = ? ORDER BY id_pairwise',
            [idKriteria]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/pairwise-sub/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/pairwise-sub', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id_kriteria, sub_1, sub_2, nilai } = req.body;

        if (!id_kriteria || !sub_1 || !sub_2 || !nilai) {
            return res.status(400).json({
                success: false,
                message: 'Data pairwise sub tidak lengkap'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM tbl_pairwise_sub WHERE id_kriteria = ? AND sub_1 = ? AND sub_2 = ?',
            [id_kriteria, sub_1, sub_2]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE tbl_pairwise_sub SET nilai = ? WHERE id_kriteria = ? AND sub_1 = ? AND sub_2 = ?',
                [nilai, id_kriteria, sub_1, sub_2]
            );
            res.json({ success: true, message: 'Pairwise sub berhasil diupdate' });
        } else {
            await db.query(
                'INSERT INTO tbl_pairwise_sub (id_kriteria, sub_1, sub_2, nilai) VALUES (?, ?, ?, ?)',
                [id_kriteria, sub_1, sub_2, nilai]
            );
            res.json({ success: true, message: 'Pairwise sub berhasil disimpan' });
        }
    } catch (err) {
        console.error('Error POST /api/pairwise-sub:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/pairwise-sub/:idKriteria', verifyToken, isAdmin, async (req, res) => {
    try {
        const { idKriteria } = req.params;
        await db.query('DELETE FROM tbl_pairwise_sub WHERE id_kriteria = ?', [idKriteria]);
        res.json({ success: true, message: 'Pairwise sub berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/pairwise-sub/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/pairwise-sub/truncate', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM tbl_pairwise_sub');
        await db.query('ALTER TABLE tbl_pairwise_sub AUTO_INCREMENT = 1');
        res.json({ success: true, message: 'Semua pairwise sub berhasil dihapus!' });
    } catch (err) {
        console.error('Error TRUNCATE /api/pairwise-sub:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE NORMALISASI SUB
// ============================================================
app.get('/api/normalisasi-sub/:idKriteria', async (req, res) => {
    try {
        const { idKriteria } = req.params;

        const [subs] = await db.query(
            'SELECT * FROM tbl_sub_kriteria WHERE id_kriteria = ? ORDER BY id_sub',
            [idKriteria]
        );

        if (subs.length < 2) {
            return res.status(400).json({
                success: false,
                message: `Minimal 2 sub-kriteria untuk normalisasi (saat ini ${subs.length})`
            });
        }

        const [pairwise] = await db.query(
            'SELECT * FROM tbl_pairwise_sub WHERE id_kriteria = ?',
            [idKriteria]
        );

        const n = subs.length;
        const subIds = subs.map(s => s.id_sub);
        const subNames = subs.map(s => s.nama_sub);

        const matrix = [];
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 1;
                } else {
                    const found = pairwise.find(
                        p => p.sub_1 === subIds[i] && p.sub_2 === subIds[j]
                    );
                    if (found) {
                        matrix[i][j] = parseFloat(found.nilai);
                    } else {
                        const foundReverse = pairwise.find(
                            p => p.sub_1 === subIds[j] && p.sub_2 === subIds[i]
                        );
                        matrix[i][j] = foundReverse ? 1 / parseFloat(foundReverse.nilai) : 3;
                    }
                }
            }
        }

        const totalPerKolom = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                sum += matrix[i][j];
            }
            totalPerKolom[j] = parseFloat(sum.toFixed(4));
        }

        const normalizedMatrix = [];
        for (let i = 0; i < n; i++) {
            normalizedMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                normalizedMatrix[i][j] = parseFloat((matrix[i][j] / totalPerKolom[j]).toFixed(4));
            }
        }

        const bobotSub = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += normalizedMatrix[i][j];
            }
            bobotSub[i] = parseFloat((sum / n).toFixed(4));
        }

        res.json({
            success: true,
            data: {
                subs: subs.map((s, i) => ({
                    id_sub: s.id_sub,
                    nama_sub: s.nama_sub,
                    bobot: bobotSub[i],
                    bobotPersen: (bobotSub[i] * 100).toFixed(2) + '%'
                })),
                matrix: {
                    labels: subNames,
                    data: matrix
                }
            }
        });

    } catch (err) {
        console.error('Error GET /api/normalisasi-sub/:id:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/normalisasi-sub/:idKriteria/simpan', verifyToken, isAdmin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { idKriteria } = req.params;

        const [subs] = await conn.query(
            'SELECT * FROM tbl_sub_kriteria WHERE id_kriteria = ? ORDER BY id_sub',
            [idKriteria]
        );

        if (subs.length < 2) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: `Minimal 2 sub-kriteria untuk normalisasi (saat ini ${subs.length})`
            });
        }

        const [pairwise] = await conn.query(
            'SELECT * FROM tbl_pairwise_sub WHERE id_kriteria = ?',
            [idKriteria]
        );

        const n = subs.length;
        const subIds = subs.map(s => s.id_sub);

        const matrix = [];
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 1;
                } else {
                    const found = pairwise.find(
                        p => p.sub_1 === subIds[i] && p.sub_2 === subIds[j]
                    );
                    if (found) {
                        matrix[i][j] = parseFloat(found.nilai);
                    } else {
                        const foundReverse = pairwise.find(
                            p => p.sub_1 === subIds[j] && p.sub_2 === subIds[i]
                        );
                        matrix[i][j] = foundReverse ? 1 / parseFloat(foundReverse.nilai) : 3;
                    }
                }
            }
        }

        const totalPerKolom = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                sum += matrix[i][j];
            }
            totalPerKolom[j] = parseFloat(sum.toFixed(4));
        }

        const normalizedMatrix = [];
        for (let i = 0; i < n; i++) {
            normalizedMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                normalizedMatrix[i][j] = parseFloat((matrix[i][j] / totalPerKolom[j]).toFixed(4));
            }
        }

        const bobotSub = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += normalizedMatrix[i][j];
            }
            bobotSub[i] = parseFloat((sum / n).toFixed(4));
        }

        await conn.beginTransaction();
        for (let i = 0; i < subIds.length; i++) {
            await conn.query(
                'UPDATE tbl_sub_kriteria SET bobot_sub = ? WHERE id_sub = ?',
                [bobotSub[i], subIds[i]]
            );
        }
        await conn.commit();

        res.json({
            success: true,
            message: `Bobot sub-kriteria berhasil disimpan!`,
            data: subs.map((s, i) => ({
                id_sub: s.id_sub,
                nama_sub: s.nama_sub,
                bobot: bobotSub[i]
            }))
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error POST /api/normalisasi-sub/:id/simpan:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

app.post('/api/normalisasi-sub/simpan-semua', verifyToken, isAdmin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        const [kriteria] = await conn.query('SELECT * FROM tbl_kriteria ORDER BY id_kriteria');

        if (kriteria.length === 0) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'Belum ada kriteria'
            });
        }

        const berhasil = [];
        const dilewati = [];

        await conn.beginTransaction();

        for (const k of kriteria) {
            const [subs] = await conn.query(
                'SELECT * FROM tbl_sub_kriteria WHERE id_kriteria = ? ORDER BY id_sub',
                [k.id_kriteria]
            );

            if (subs.length < 2) {
                dilewati.push({
                    id_kriteria: k.id_kriteria,
                    nama_kriteria: k.nama_kriteria,
                    alasan: `Hanya ${subs.length} sub-kriteria (minimal 2)`
                });
                continue;
            }

            const [pairwise] = await conn.query(
                'SELECT * FROM tbl_pairwise_sub WHERE id_kriteria = ?',
                [k.id_kriteria]
            );

            const n = subs.length;
            const subIds = subs.map(s => s.id_sub);

            const matrix = [];
            for (let i = 0; i < n; i++) {
                matrix[i] = [];
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        matrix[i][j] = 1;
                    } else {
                        const found = pairwise.find(
                            p => p.sub_1 === subIds[i] && p.sub_2 === subIds[j]
                        );
                        if (found) {
                            matrix[i][j] = parseFloat(found.nilai);
                        } else {
                            const foundReverse = pairwise.find(
                                p => p.sub_1 === subIds[j] && p.sub_2 === subIds[i]
                            );
                            matrix[i][j] = foundReverse ? 1 / parseFloat(foundReverse.nilai) : 3;
                        }
                    }
                }
            }

            const totalPerKolom = [];
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let i = 0; i < n; i++) {
                    sum += matrix[i][j];
                }
                totalPerKolom[j] = parseFloat(sum.toFixed(4));
            }

            const normalizedMatrix = [];
            for (let i = 0; i < n; i++) {
                normalizedMatrix[i] = [];
                for (let j = 0; j < n; j++) {
                    normalizedMatrix[i][j] = parseFloat((matrix[i][j] / totalPerKolom[j]).toFixed(4));
                }
            }

            const bobotSub = [];
            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    sum += normalizedMatrix[i][j];
                }
                bobotSub[i] = parseFloat((sum / n).toFixed(4));
            }

            for (let i = 0; i < subIds.length; i++) {
                await conn.query(
                    'UPDATE tbl_sub_kriteria SET bobot_sub = ? WHERE id_sub = ?',
                    [bobotSub[i], subIds[i]]
                );
            }

            berhasil.push({
                id_kriteria: k.id_kriteria,
                nama_kriteria: k.nama_kriteria,
                jumlah_sub: subs.length
            });
        }

        await conn.commit();

        res.json({
            success: true,
            message: `✅ ${berhasil.length} kriteria berhasil disimpan, ${dilewati.length} dilewati`,
            data: {
                berhasil: berhasil,
                dilewati: dilewati
            }
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error POST /api/normalisasi-sub/simpan-semua:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

// ============================================================
// ROUTE HITUNG GLOBAL
// ============================================================
app.post('/api/hitung-global', verifyToken, isAdmin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        const [kriteria] = await conn.query('SELECT * FROM tbl_kriteria');
        const [subKriteria] = await conn.query('SELECT * FROM tbl_sub_kriteria');

        if (kriteria.length === 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Belum ada kriteria' });
        }
        if (subKriteria.length === 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Belum ada sub-kriteria' });
        }

        const bobotKriteriaMap = {};
        for (const k of kriteria) {
            bobotKriteriaMap[k.id_kriteria] = parseFloat(k.bobot) || 0;
        }

        await conn.beginTransaction();
        let updatedCount = 0;
        const hasilUpdate = [];

        for (const sub of subKriteria) {
            const bobotKrit = bobotKriteriaMap[sub.id_kriteria] || 0;
            const bobotSub = parseFloat(sub.bobot_sub) || 0;
            const bobotGlobal = parseFloat((bobotKrit * bobotSub).toFixed(6));

            await conn.query(
                'UPDATE tbl_sub_kriteria SET bobot_global = ? WHERE id_sub = ?',
                [bobotGlobal, sub.id_sub]
            );
            updatedCount++;
            hasilUpdate.push({
                id_sub: sub.id_sub,
                nama_sub: sub.nama_sub,
                bobot_global: bobotGlobal
            });
        }

        await conn.commit();
        conn.release();

        res.json({
            success: true,
            message: `✅ ${updatedCount} sub-kriteria diperbarui`,
            data: hasilUpdate
        });

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('Error POST /api/hitung-global:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE NORMALISASI KRITERIA
// ============================================================
app.get('/api/normalisasi', async (req, res) => {
    try {
        const [kriteria] = await db.query('SELECT * FROM tbl_kriteria ORDER BY id_kriteria');
        if (kriteria.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data kriteria belum tersedia'
            });
        }

        const [pairwise] = await db.query('SELECT * FROM tbl_pairwise_kriteria');
        if (pairwise.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data pairwise belum diisi. Silakan input pairwise terlebih dahulu!'
            });
        }

        const n = kriteria.length;
        const kriteriaNames = kriteria.map(k => k.nama_kriteria);
        const kriteriaIds = kriteria.map(k => k.id_kriteria);

        const matrix = [];
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 1;
                } else {
                    const found = pairwise.find(
                        p => p.kriteria_1 === kriteriaIds[i] && p.kriteria_2 === kriteriaIds[j]
                    );
                    if (found) {
                        matrix[i][j] = parseFloat(found.nilai);
                    } else {
                        const foundReverse = pairwise.find(
                            p => p.kriteria_1 === kriteriaIds[j] && p.kriteria_2 === kriteriaIds[i]
                        );
                        matrix[i][j] = foundReverse ? 1 / parseFloat(foundReverse.nilai) : 1;
                    }
                }
            }
        }

        const totalPerKolom = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                sum += matrix[i][j];
            }
            totalPerKolom[j] = parseFloat(sum.toFixed(4));
        }

        const normalizedMatrix = [];
        for (let i = 0; i < n; i++) {
            normalizedMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                normalizedMatrix[i][j] = parseFloat((matrix[i][j] / totalPerKolom[j]).toFixed(4));
            }
        }

        const bobotKriteria = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += normalizedMatrix[i][j];
            }
            bobotKriteria[i] = parseFloat((sum / n).toFixed(6));
        }

        for (let i = 0; i < n; i++) {
            await db.query(
                'UPDATE tbl_kriteria SET bobot = ? WHERE id_kriteria = ?',
                [bobotKriteria[i], kriteriaIds[i]]
            );
        }

        res.json({
            success: true,
            data: {
                jumlahKriteria: n,
                kriteriaNames: kriteriaNames,
                bobotKriteria: kriteria.map((k, i) => ({
                    id_kriteria: k.id_kriteria,
                    nama_kriteria: k.nama_kriteria,
                    bobot: bobotKriteria[i],
                    bobotPersen: (bobotKriteria[i] * 100).toFixed(2) + '%'
                }))
            }
        });

    } catch (err) {
        console.error('Error GET /api/normalisasi:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE AHP
// ============================================================
app.post('/api/ahp/hitung', verifyToken, isAdmin, async (req, res) => {
    try {
        const [alternatifs] = await db.query('SELECT * FROM tbl_alternatif ORDER BY id_alternatif');
        if (alternatifs.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Belum ada buku/alternatif'
            });
        }

        const [subKriteria] = await db.query(`
            SELECT sk.id_sub, sk.bobot_global, sk.nama_sub
            FROM tbl_sub_kriteria sk
            JOIN tbl_kriteria k ON sk.id_kriteria = k.id_kriteria
            ORDER BY sk.id_sub
        `);

        if (subKriteria.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Belum ada sub-kriteria'
            });
        }

        await db.query('DELETE FROM tbl_hasil_ahp');

        const hasilRanking = [];

        for (const alt of alternatifs) {
            const [nilaiAlt] = await db.query(`
                SELECT na.*, sk.bobot_global
                FROM tbl_nilai_alternatif na
                JOIN tbl_sub_kriteria sk ON na.id_sub = sk.id_sub
                WHERE na.id_alternatif = ?
            `, [alt.id_alternatif]);

            let skor = 0;
            for (const n of nilaiAlt) {
                const bobotGlobal = parseFloat(n.bobot_global) || 0;
                skor += bobotGlobal;
            }

            hasilRanking.push({
                id_alternatif: alt.id_alternatif,
                judul_buku: alt.judul_buku,
                skor: parseFloat(skor.toFixed(4))
            });
        }

        hasilRanking.sort((a, b) => b.skor - a.skor);

        for (let i = 0; i < hasilRanking.length; i++) {
            await db.query(
                'INSERT INTO tbl_hasil_ahp (id_alternatif, skor_total, peringkat) VALUES (?, ?, ?)',
                [hasilRanking[i].id_alternatif, hasilRanking[i].skor, i + 1]
            );
        }

        res.json({
            success: true,
            message: 'Perhitungan AHP berhasil',
            data: hasilRanking.map((h, i) => ({
                ...h,
                peringkat: i + 1
            }))
        });

    } catch (err) {
        console.error('Error POST /api/ahp/hitung:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/ahp/hasil', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                h.*, 
                a.judul_buku,
                a.penulis,
                a.penerbit
            FROM tbl_hasil_ahp h
            JOIN tbl_alternatif a ON h.id_alternatif = a.id_alternatif
            ORDER BY h.peringkat
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/ahp/hasil:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/ahp/hasil', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM tbl_hasil_ahp');
        await db.query('ALTER TABLE tbl_hasil_ahp AUTO_INCREMENT = 1');
        res.json({ success: true, message: 'Hasil AHP berhasil dihapus' });
    } catch (err) {
        console.error('Error DELETE /api/ahp/hasil:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE STATISTIK
// ============================================================
app.get('/api/stats', async (req, res) => {
    try {
        const [kriteria] = await db.query('SELECT COUNT(*) as total FROM tbl_kriteria');
        const [buku] = await db.query('SELECT COUNT(*) as total FROM tbl_alternatif');
        const [hasil] = await db.query('SELECT COUNT(*) as total FROM tbl_hasil_ahp');
        const [sub] = await db.query('SELECT COUNT(*) as total FROM tbl_sub_kriteria');
        const [pair] = await db.query('SELECT COUNT(*) as total FROM tbl_pairwise_kriteria');

        res.json({
            success: true,
            data: {
                totalKriteria: kriteria[0].total || 0,
                totalBuku: buku[0].total || 0,
                totalHasil: hasil[0].total || 0,
                totalSubKriteria: sub[0].total || 0,
                totalPairwise: pair[0].total || 0
            }
        });
    } catch (err) {
        console.error('Error GET /api/stats:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ROUTE PEMINJAMAN - CREATE TABLES
// ============================================================
(async () => {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'tbl_peminjaman'");
        if (tables.length === 0) {
            await db.query(`
                CREATE TABLE tbl_peminjaman (
                    id_peminjaman INT PRIMARY KEY AUTO_INCREMENT,
                    id_user INT NOT NULL,
                    id_buku INT NOT NULL,
                    tanggal_pinjam DATE NOT NULL,
                    tanggal_kembali DATE,
                    status ENUM('pending', 'dipinjam', 'dikembalikan', 'ditolak', 'terlambat') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_user) REFERENCES tbl_user(id_user) ON DELETE CASCADE,
                    FOREIGN KEY (id_buku) REFERENCES tbl_alternatif(id_alternatif) ON DELETE CASCADE
                )
            `);
            console.log('✅ Tabel tbl_peminjaman dibuat');
        }
    } catch (err) {
        console.log('⚠️ Tabel tbl_peminjaman sudah ada');
    }
})();

(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS tbl_rating (
                id_rating INT PRIMARY KEY AUTO_INCREMENT,
                id_user INT NOT NULL,
                id_buku INT NOT NULL,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                komentar TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_user) REFERENCES tbl_user(id_user) ON DELETE CASCADE,
                FOREIGN KEY (id_buku) REFERENCES tbl_alternatif(id_alternatif) ON DELETE CASCADE,
                UNIQUE KEY unique_rating (id_user, id_buku)
            )
        `);
        console.log('✅ Tabel tbl_rating siap');
    } catch (err) {}
})();

// ============================================================
// ROUTE PEMINJAMAN - USER
// ============================================================
app.post('/api/peminjaman', verifyToken, isUser, async (req, res) => {
    try {
        const { id_buku, tanggal_pinjam } = req.body;
        const id_user = req.user.id_user;

        if (!id_buku || !tanggal_pinjam) {
            return res.status(400).json({
                success: false,
                message: 'Data peminjaman tidak lengkap'
            });
        }

        const [buku] = await db.query(
            'SELECT stok FROM tbl_alternatif WHERE id_alternatif = ?',
            [id_buku]
        );

        if (buku.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Buku tidak ditemukan'
            });
        }

        if (buku[0].stok <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Stok buku habis'
            });
        }

        const [existing] = await db.query(
            `SELECT * FROM tbl_peminjaman 
             WHERE id_user = ? AND id_buku = ? AND status IN ('pending', 'dipinjam')`,
            [id_user, id_buku]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah mengajukan peminjaman buku ini atau sedang meminjam'
            });
        }

        const [result] = await db.query(
            `INSERT INTO tbl_peminjaman (id_user, id_buku, tanggal_pinjam, status) 
             VALUES (?, ?, ?, 'pending')`,
            [id_user, id_buku, tanggal_pinjam]
        );

        res.json({
            success: true,
            message: 'Pengajuan peminjaman berhasil! Menunggu verifikasi admin.',
            data: { 
                id_peminjaman: result.insertId,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error POST /api/peminjaman:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/peminjaman/riwayat', verifyToken, isUser, async (req, res) => {
    try {
        const id_user = req.user.id_user;

        const [rows] = await db.query(
            `SELECT p.*, b.judul_buku, b.penulis, b.gambar
             FROM tbl_peminjaman p
             JOIN tbl_alternatif b ON p.id_buku = b.id_alternatif
             WHERE p.id_user = ?
             ORDER BY p.created_at DESC`,
            [id_user]
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error GET /api/peminjaman/riwayat:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.put('/api/peminjaman/:id/kembali', verifyToken, isUser, async (req, res) => {
    try {
        const { id } = req.params;
        const id_user = req.user.id_user;

        const [peminjaman] = await db.query(
            `SELECT * FROM tbl_peminjaman 
             WHERE id_peminjaman = ? AND id_user = ? AND status = 'dipinjam'`,
            [id, id_user]
        );

        if (peminjaman.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan atau sudah dikembalikan'
            });
        }

        await db.query(
            `UPDATE tbl_peminjaman 
             SET status = 'dikembalikan', tanggal_kembali = CURDATE()
             WHERE id_peminjaman = ?`,
            [id]
        );

        await db.query(
            'UPDATE tbl_alternatif SET stok = stok + 1 WHERE id_alternatif = ?',
            [peminjaman[0].id_buku]
        );

        res.json({
            success: true,
            message: '✅ Buku berhasil dikembalikan'
        });

    } catch (error) {
        console.error('Error PUT /api/peminjaman/:id/kembali:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

// ============================================================
// ROUTE PEMINJAMAN - ADMIN
// ============================================================
app.get('/api/peminjaman/all', verifyToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                p.id_peminjaman,
                p.id_user,
                p.id_buku,
                p.tanggal_pinjam,
                p.tanggal_kembali,
                p.status,
                p.created_at,
                p.updated_at,
                u.nama_lengkap, 
                u.username,
                b.judul_buku,
                b.penulis as penulis_buku
             FROM tbl_peminjaman p
             LEFT JOIN tbl_user u ON p.id_user = u.id_user
             LEFT JOIN tbl_alternatif b ON p.id_buku = b.id_alternatif
             ORDER BY 
                CASE p.status 
                    WHEN 'pending' THEN 0 
                    WHEN 'dipinjam' THEN 1 
                    WHEN 'terlambat' THEN 2 
                    WHEN 'dikembalikan' THEN 3 
                    WHEN 'ditolak' THEN 4 
                END,
                p.created_at DESC`
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error GET /api/peminjaman/all:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server: ' + error.message
        });
    }
});

app.put('/api/peminjaman/admin/:id/verifikasi', verifyToken, isAdmin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { id } = req.params;

        const [peminjaman] = await conn.query(
            'SELECT * FROM tbl_peminjaman WHERE id_peminjaman = ? AND status = "pending"',
            [id]
        );

        if (peminjaman.length === 0) {
            conn.release();
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan atau sudah diproses'
            });
        }

        const data = peminjaman[0];

        const [buku] = await conn.query(
            'SELECT stok FROM tbl_alternatif WHERE id_alternatif = ?',
            [data.id_buku]
        );

        if (buku.length === 0) {
            conn.release();
            return res.status(404).json({
                success: false,
                message: 'Buku tidak ditemukan'
            });
        }

        if (buku[0].stok <= 0) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'Stok buku habis'
            });
        }

        await conn.beginTransaction();

        await conn.query(
            'UPDATE tbl_peminjaman SET status = "dipinjam" WHERE id_peminjaman = ?',
            [id]
        );

        await conn.query(
            'UPDATE tbl_alternatif SET stok = stok - 1 WHERE id_alternatif = ?',
            [data.id_buku]
        );

        await conn.commit();
        conn.release();

        res.json({
            success: true,
            message: '✅ Peminjaman berhasil diverifikasi dan buku telah dipinjam'
        });

    } catch (error) {
        await conn.rollback();
        conn.release();
        console.error('Error verifikasi peminjaman:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.put('/api/peminjaman/admin/:id/tolak', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [peminjaman] = await db.query(
            'SELECT * FROM tbl_peminjaman WHERE id_peminjaman = ? AND status = "pending"',
            [id]
        );

        if (peminjaman.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan atau sudah diproses'
            });
        }

        await db.query(
            'UPDATE tbl_peminjaman SET status = "ditolak" WHERE id_peminjaman = ?',
            [id]
        );

        res.json({
            success: true,
            message: '✅ Peminjaman berhasil ditolak'
        });

    } catch (error) {
        console.error('Error tolak peminjaman:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.put('/api/peminjaman/admin/:id/kembali', verifyToken, isAdmin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { id } = req.params;

        const [peminjaman] = await conn.query(
            'SELECT * FROM tbl_peminjaman WHERE id_peminjaman = ? AND status = "dipinjam"',
            [id]
        );

        if (peminjaman.length === 0) {
            conn.release();
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan atau sudah dikembalikan'
            });
        }

        await conn.beginTransaction();

        await conn.query(
            `UPDATE tbl_peminjaman 
             SET status = "dikembalikan", tanggal_kembali = CURDATE()
             WHERE id_peminjaman = ?`,
            [id]
        );

        await conn.query(
            'UPDATE tbl_alternatif SET stok = stok + 1 WHERE id_alternatif = ?',
            [peminjaman[0].id_buku]
        );

        await conn.commit();
        conn.release();

        res.json({
            success: true,
            message: '✅ Buku berhasil dikembalikan'
        });

    } catch (error) {
        await conn.rollback();
        conn.release();
        console.error('Error pengembalian buku:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/peminjaman/admin', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id_user, id_buku, tanggal_pinjam, tanggal_kembali, status = 'pending' } = req.body;

        if (!id_user || !id_buku || !tanggal_pinjam) {
            return res.status(400).json({
                success: false,
                message: 'Data peminjaman tidak lengkap'
            });
        }

        const [userCheck] = await db.query(
            'SELECT id_user FROM tbl_user WHERE id_user = ?',
            [id_user]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        const [bukuCheck] = await db.query(
            'SELECT id_alternatif, stok FROM tbl_alternatif WHERE id_alternatif = ?',
            [id_buku]
        );

        if (bukuCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Buku tidak ditemukan'
            });
        }

        const [result] = await db.query(
            `INSERT INTO tbl_peminjaman (id_user, id_buku, tanggal_pinjam, tanggal_kembali, status) 
             VALUES (?, ?, ?, ?, ?)`,
            [id_user, id_buku, tanggal_pinjam, tanggal_kembali || null, status || 'pending']
        );

        res.json({
            success: true,
            message: '✅ Peminjaman berhasil ditambahkan (menunggu verifikasi)',
            data: { id_peminjaman: result.insertId }
        });

    } catch (error) {
        console.error('Error admin add peminjaman:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.put('/api/peminjaman/admin/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { id_user, id_buku, tanggal_pinjam, tanggal_kembali, status } = req.body;

        const [existing] = await db.query(
            'SELECT * FROM tbl_peminjaman WHERE id_peminjaman = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan'
            });
        }

        const peminjaman = existing[0];

        if (peminjaman.status === 'pending' && status === 'dipinjam') {
            const [buku] = await db.query(
                'SELECT stok FROM tbl_alternatif WHERE id_alternatif = ?',
                [id_buku || peminjaman.id_buku]
            );
            if (buku[0].stok <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Stok buku habis'
                });
            }
            await db.query(
                'UPDATE tbl_alternatif SET stok = stok - 1 WHERE id_alternatif = ?',
                [id_buku || peminjaman.id_buku]
            );
        }

        if (peminjaman.status === 'dipinjam' && status === 'dikembalikan') {
            await db.query(
                'UPDATE tbl_alternatif SET stok = stok + 1 WHERE id_alternatif = ?',
                [id_buku || peminjaman.id_buku]
            );
        }

        await db.query(
            `UPDATE tbl_peminjaman 
             SET id_user = ?, id_buku = ?, tanggal_pinjam = ?, tanggal_kembali = ?, status = ?
             WHERE id_peminjaman = ?`,
            [id_user || peminjaman.id_user, 
             id_buku || peminjaman.id_buku, 
             tanggal_pinjam || peminjaman.tanggal_pinjam,
             tanggal_kembali || peminjaman.tanggal_kembali,
             status || peminjaman.status,
             id]
        );

        res.json({
            success: true,
            message: '✅ Peminjaman berhasil diupdate'
        });

    } catch (error) {
        console.error('Error admin update peminjaman:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.delete('/api/peminjaman/admin/:id', verifyToken, isAdmin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { id } = req.params;

        const [peminjaman] = await conn.query(
            'SELECT * FROM tbl_peminjaman WHERE id_peminjaman = ?',
            [id]
        );

        if (peminjaman.length === 0) {
            conn.release();
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan'
            });
        }

        if (peminjaman[0].status === 'dipinjam') {
            await conn.beginTransaction();
            await conn.query(
                'UPDATE tbl_alternatif SET stok = stok + 1 WHERE id_alternatif = ?',
                [peminjaman[0].id_buku]
            );
        }

        await conn.query(
            'DELETE FROM tbl_peminjaman WHERE id_peminjaman = ?',
            [id]
        );

        if (peminjaman[0].status === 'dipinjam') {
            await conn.commit();
        }

        conn.release();

        res.json({
            success: true,
            message: '✅ Peminjaman berhasil dihapus'
        });

    } catch (error) {
        await conn.rollback();
        conn.release();
        console.error('Error admin delete peminjaman:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

// ============================================================
// ROUTE RATING
// ============================================================
app.post('/api/rating', verifyToken, isUser, async (req, res) => {
    try {
        const { id_buku, rating, komentar } = req.body;
        const id_user = req.user.id_user;

        if (!id_buku || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Data rating tidak lengkap'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating harus antara 1-5'
            });
        }

        const [peminjaman] = await db.query(
            `SELECT * FROM tbl_peminjaman 
             WHERE id_user = ? AND id_buku = ? AND status = 'dikembalikan'`,
            [id_user, id_buku]
        );

        if (peminjaman.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda belum meminjam buku ini atau belum dikembalikan'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM tbl_rating WHERE id_user = ? AND id_buku = ?',
            [id_user, id_buku]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE tbl_rating SET rating = ?, komentar = ? WHERE id_user = ? AND id_buku = ?',
                [rating, komentar || null, id_user, id_buku]
            );
            return res.json({
                success: true,
                message: 'Rating berhasil diupdate'
            });
        }

        await db.query(
            'INSERT INTO tbl_rating (id_user, id_buku, rating, komentar) VALUES (?, ?, ?, ?)',
            [id_user, id_buku, rating, komentar || null]
        );

        res.json({
            success: true,
            message: 'Rating berhasil diberikan'
        });

    } catch (error) {
        console.error('Error POST /api/rating:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/rating/buku/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [ratings] = await db.query(
            `SELECT r.*, u.nama_lengkap, u.username
             FROM tbl_rating r
             JOIN tbl_user u ON r.id_user = u.id_user
             WHERE r.id_buku = ?
             ORDER BY r.created_at DESC`,
            [id]
        );

        const [avg] = await db.query(
            'SELECT AVG(rating) as average, COUNT(*) as total FROM tbl_rating WHERE id_buku = ?',
            [id]
        );

        res.json({
            success: true,
            data: {
                ratings,
                average: avg[0].average || 0,
                total: avg[0].total || 0
            }
        });

    } catch (error) {
        console.error('Error GET /api/rating/buku/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/rating/user', verifyToken, isUser, async (req, res) => {
    try {
        const id_user = req.user.id_user;

        const [ratings] = await db.query(
            `SELECT r.*, b.judul_buku, b.penulis, b.gambar
             FROM tbl_rating r
             JOIN tbl_alternatif b ON r.id_buku = b.id_alternatif
             WHERE r.id_user = ?
             ORDER BY r.created_at DESC`,
            [id_user]
        );

        res.json({
            success: true,
            data: ratings
        });

    } catch (error) {
        console.error('Error GET /api/rating/user:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/rating/all', verifyToken, isAdmin, async (req, res) => {
    try {
        const [ratings] = await db.query(
            `SELECT r.*, u.nama_lengkap, u.username, b.judul_buku
             FROM tbl_rating r
             JOIN tbl_user u ON r.id_user = u.id_user
             JOIN tbl_alternatif b ON r.id_buku = b.id_alternatif
             ORDER BY r.created_at DESC`
        );

        res.json({
            success: true,
            data: ratings
        });

    } catch (error) {
        console.error('Error GET /api/rating/all:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

// ============================================================
// ROUTE DASHBOARD
// ============================================================
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
    try {
        const [totalBuku] = await db.query('SELECT COUNT(*) as total FROM tbl_alternatif');
        const [totalDipinjam] = await db.query(
            'SELECT COUNT(*) as total FROM tbl_peminjaman WHERE status = "dipinjam"'
        );
        const [totalUser] = await db.query('SELECT COUNT(*) as total FROM tbl_user WHERE role = "user"');

        const [populer] = await db.query(`
            SELECT b.id_alternatif, b.judul_buku, b.penulis, AVG(r.rating) as avg_rating, COUNT(r.id_rating) as total_rating
            FROM tbl_alternatif b
            LEFT JOIN tbl_rating r ON b.id_alternatif = r.id_buku
            GROUP BY b.id_alternatif
            HAVING total_rating > 0
            ORDER BY avg_rating DESC
            LIMIT 5
        `);

        const [peminjamanTerbaru] = await db.query(`
            SELECT p.*, u.nama_lengkap, u.username, b.judul_buku
            FROM tbl_peminjaman p
            JOIN tbl_user u ON p.id_user = u.id_user
            JOIN tbl_alternatif b ON p.id_buku = b.id_alternatif
            ORDER BY p.created_at DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                totalBuku: totalBuku[0].total || 0,
                totalDipinjam: totalDipinjam[0].total || 0,
                totalUser: totalUser[0].total || 0,
                bukuPopuler: populer,
                peminjamanTerbaru: peminjamanTerbaru
            }
        });

    } catch (error) {
        console.error('Error GET /api/dashboard/stats:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((req, res) => {
    console.log('❌ 404 Not Found:', req.method, req.url);
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.url} tidak ditemukan`
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: err.message
    });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log('\n============================================');
    console.log('🚀 SERVER SPK AHP PERPUSTAKAAN BREBES');
    console.log('============================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
    console.log(`📋 Test:   http://localhost:${PORT}/api/test`);
    console.log(`📋 Login:  http://localhost:${PORT}/api/auth/login`);
    console.log(`📋 CORS:   * (ALLOWED)`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'railway'}`);
    console.log('============================================\n');
});

module.exports = app;
