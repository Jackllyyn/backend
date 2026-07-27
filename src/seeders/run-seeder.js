const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function runSeeder() {
    try {
        console.log('🚀 Memulai seeder...');

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const existingAdmin = await query(
            'SELECT id_user FROM tbl_user WHERE username = ?',
            ['admin']
        );

        if (existingAdmin.length === 0) {
            await query(
                `INSERT INTO tbl_user (username, password, nama_lengkap, email, role) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['admin', adminPassword, 'Administrator', 'admin@perpustakaan.com', 'superadmin']
            );
            console.log('✅ User admin (superadmin) berhasil dibuat');
        } else {
            console.log('ℹ️ User admin sudah ada');
        }

        // Create sample user
        const userPassword = await bcrypt.hash('user123', 10);
        const existingUser = await query(
            'SELECT id_user FROM tbl_user WHERE username = ?',
            ['user']
        );

        if (existingUser.length === 0) {
            await query(
                `INSERT INTO tbl_user (username, password, nama_lengkap, email, role) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['user', userPassword, 'User Biasa', 'user@perpustakaan.com', 'user']
            );
            console.log('✅ User biasa berhasil dibuat');
        } else {
            console.log('ℹ️ User biasa sudah ada');
        }

        console.log('');
        console.log('🎉 SEEDER BERHASIL!');
        console.log('📋 Akun yang tersedia:');
        console.log('   Admin (superadmin): admin / admin123');
        console.log('   User biasa:         user / user123');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Detail:', error);
        process.exit(1);
    }
}

runSeeder();