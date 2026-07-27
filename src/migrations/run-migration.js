// run-migration.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Konfigurasi database
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_ahp',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
};

async function runMigration() {
    let connection;
    
    try {
        console.log('🚀 Memulai migrasi database...');
        console.log(`📡 Menghubungkan ke database: ${dbConfig.database}...`);
        
        // Buat koneksi ke database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Berhasil terhubung ke database');
        console.log('');

        console.log('📋 Membuat tabel-tabel...');
        console.log('━'.repeat(50));

        // Cek apakah database menggunakan foreign key
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // ========================================
        // 1. TABEL KRITERIA
        // ========================================
        console.log('📌 Membuat tabel tbl_kriteria...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_kriteria (
                id_kriteria INT(11) NOT NULL AUTO_INCREMENT,
                nama_kriteria VARCHAR(50) NOT NULL,
                tipe ENUM('benefit', 'cost') DEFAULT 'benefit',
                bobot DECIMAL(10,6) DEFAULT 0.000000,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_kriteria)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_kriteria berhasil dibuat');
        console.log('');

        // ========================================
        // 2. TABEL SUB KRITERIA
        // ========================================
        console.log('📌 Membuat tabel tbl_sub_kriteria...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_sub_kriteria (
                id_sub INT(11) NOT NULL AUTO_INCREMENT,
                id_kriteria INT(11) NOT NULL,
                nama_sub VARCHAR(50) NOT NULL,
                bobot_sub DECIMAL(10,6) DEFAULT 0.000000,
                bobot_global DECIMAL(10,6) DEFAULT 0.000000,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_sub),
                KEY id_kriteria (id_kriteria),
                CONSTRAINT tbl_sub_kriteria_ibfk_1 
                    FOREIGN KEY (id_kriteria) 
                    REFERENCES tbl_kriteria (id_kriteria) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_sub_kriteria berhasil dibuat');
        console.log('');

        // ========================================
        // 3. TABEL ALTERNATIF
        // ========================================
        console.log('📌 Membuat tabel tbl_alternatif...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_alternatif (
                id_alternatif INT(11) NOT NULL AUTO_INCREMENT,
                judul_buku VARCHAR(200) NOT NULL,
                penulis VARCHAR(100) DEFAULT NULL,
                penerbit VARCHAR(100) DEFAULT NULL,
                tahun_terbit VARCHAR(20) DEFAULT NULL,
                stok INT(11) DEFAULT 0,
                gambar VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_alternatif)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_alternatif berhasil dibuat');
        console.log('');

        // ========================================
        // 4. TABEL NILAI ALTERNATIF
        // ========================================
        console.log('📌 Membuat tabel tbl_nilai_alternatif...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_nilai_alternatif (
                id_nilai INT(11) NOT NULL AUTO_INCREMENT,
                id_alternatif INT(11) NOT NULL,
                id_sub INT(11) NOT NULL,
                nilai DECIMAL(5,2) DEFAULT 0.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_nilai),
                KEY id_alternatif (id_alternatif),
                KEY id_sub (id_sub),
                CONSTRAINT tbl_nilai_alternatif_ibfk_1 
                    FOREIGN KEY (id_alternatif) 
                    REFERENCES tbl_alternatif (id_alternatif) 
                    ON DELETE CASCADE,
                CONSTRAINT tbl_nilai_alternatif_ibfk_2 
                    FOREIGN KEY (id_sub) 
                    REFERENCES tbl_sub_kriteria (id_sub) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_nilai_alternatif berhasil dibuat');
        console.log('');

        // ========================================
        // 5. TABEL PAIRWISE KRITERIA
        // ========================================
        console.log('📌 Membuat tabel tbl_pairwise_kriteria...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_pairwise_kriteria (
                id_pairwise INT(11) NOT NULL AUTO_INCREMENT,
                kriteria_1 INT(11) NOT NULL,
                kriteria_2 INT(11) NOT NULL,
                nilai DECIMAL(10,4) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_pairwise),
                KEY kriteria_1 (kriteria_1),
                KEY kriteria_2 (kriteria_2),
                CONSTRAINT tbl_pairwise_kriteria_ibfk_1 
                    FOREIGN KEY (kriteria_1) 
                    REFERENCES tbl_kriteria (id_kriteria) 
                    ON DELETE CASCADE,
                CONSTRAINT tbl_pairwise_kriteria_ibfk_2 
                    FOREIGN KEY (kriteria_2) 
                    REFERENCES tbl_kriteria (id_kriteria) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_pairwise_kriteria berhasil dibuat');
        console.log('');

        // ========================================
        // 6. TABEL PAIRWISE SUB
        // ========================================
        console.log('📌 Membuat tabel tbl_pairwise_sub...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_pairwise_sub (
                id_pairwise INT(11) NOT NULL AUTO_INCREMENT,
                id_kriteria INT(11) NOT NULL,
                sub_1 INT(11) NOT NULL,
                sub_2 INT(11) NOT NULL,
                nilai DECIMAL(10,4) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_pairwise),
                KEY id_kriteria (id_kriteria),
                KEY sub_1 (sub_1),
                KEY sub_2 (sub_2),
                CONSTRAINT tbl_pairwise_sub_ibfk_1 
                    FOREIGN KEY (id_kriteria) 
                    REFERENCES tbl_kriteria (id_kriteria) 
                    ON DELETE CASCADE,
                CONSTRAINT tbl_pairwise_sub_ibfk_2 
                    FOREIGN KEY (sub_1) 
                    REFERENCES tbl_sub_kriteria (id_sub) 
                    ON DELETE CASCADE,
                CONSTRAINT tbl_pairwise_sub_ibfk_3 
                    FOREIGN KEY (sub_2) 
                    REFERENCES tbl_sub_kriteria (id_sub) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_pairwise_sub berhasil dibuat');
        console.log('');

        // ========================================
        // 7. TABEL HASIL AHP
        // ========================================
        console.log('📌 Membuat tabel tbl_hasil_ahp...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_hasil_ahp (
                id_hasil INT(11) NOT NULL AUTO_INCREMENT,
                id_alternatif INT(11) NOT NULL,
                skor_total DECIMAL(10,6) NOT NULL,
                peringkat INT(11) NOT NULL,
                tanggal_perhitungan TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_hasil),
                KEY id_alternatif (id_alternatif),
                CONSTRAINT tbl_hasil_ahp_ibfk_1 
                    FOREIGN KEY (id_alternatif) 
                    REFERENCES tbl_alternatif (id_alternatif) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_hasil_ahp berhasil dibuat');
        console.log('');

        // ========================================
        // 8. TABEL USER
        // ========================================
        console.log('📌 Membuat tabel tbl_user...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_user (
                id_user INT(11) NOT NULL AUTO_INCREMENT,
                username VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                nama_lengkap VARCHAR(100) DEFAULT NULL,
                email VARCHAR(100) DEFAULT NULL,
                role ENUM('admin','superadmin') DEFAULT 'admin',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_user),
                UNIQUE KEY username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabel tbl_user berhasil dibuat');
        console.log('');

        // Aktifkan kembali foreign key
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('━'.repeat(50));
        console.log('');

        // ========================================
        // TAMPILKAN SEMUA TABEL
        // ========================================
        console.log('📊 Daftar tabel yang berhasil dibuat:');
        console.log('━'.repeat(50));
        
        const [tables] = await connection.query(`
            SELECT TABLE_NAME, 
                   TABLE_ROWS, 
                   ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)',
                   CREATE_TIME
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = '${dbConfig.database}'
            ORDER BY TABLE_NAME
        `);

        if (tables.length > 0) {
            console.log('┌─────────────────────────┬──────────┬──────────┬─────────────────────┐');
            console.log('│ Nama Tabel              │ Baris    │ Size(MB) │ Waktu Dibuat        │');
            console.log('├─────────────────────────┼──────────┼──────────┼─────────────────────┤');
            
            tables.forEach(table => {
                const name = table.TABLE_NAME.padEnd(23);
                const rows = String(table.TABLE_ROWS || 0).padEnd(8);
                const size = String(table['Size (MB)'] || 0).padEnd(8);
                const time = table.CREATE_TIME ? 
                    table.CREATE_TIME.toLocaleString('id-ID') : 
                    'N/A';
                console.log(`│ ${name}│ ${rows}│ ${size}│ ${time.padEnd(19)}│`);
            });
            
            console.log('└─────────────────────────┴──────────┴──────────┴─────────────────────┘');
        }

        console.log('');
        console.log('🎉 SEMUA TABEL BERHASIL DIBUAT!');
        console.log('📋 Total tabel: 8 tabel');
        console.log('');
        console.log('📌 Langkah selanjutnya:');
        console.log('   1. npm run seed (untuk mengisi data awal)');
        console.log('   2. npm start (untuk menjalankan server)');
        console.log('');

        // ========================================
        // INSERT DATA USER ADMIN DEFAULT (Optional)
        // ========================================
        console.log('👤 Mengecek user admin...');
        const [adminCheck] = await connection.query(
            'SELECT * FROM tbl_user WHERE username = ?', 
            ['admin']
        );

        if (adminCheck.length === 0) {
            console.log('📌 Menambahkan user admin default...');
            const md5Password = require('crypto')
                .createHash('md5')
                .update('admin')
                .digest('hex');
                
            await connection.query(`
                INSERT INTO tbl_user (username, password, nama_lengkap, role) 
                VALUES (?, ?, ?, ?)
            `, ['admin', md5Password, 'Administrator', 'admin']);
            console.log('✅ User admin berhasil ditambahkan (password: admin)');
        } else {
            console.log('✅ User admin sudah ada, skip insert');
        }
        console.log('');

        // Tutup koneksi
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('📝 Detail error:', error);
        
        if (connection) {
            try {
                await connection.end();
            } catch (e) {
                // Ignore
            }
        }
        process.exit(1);
    }
}

// ========================================
// CEK DATABASE SEBELUM MIGRASI
// ========================================
async function checkDatabase() {
    let connection;
    try {
        // Buat koneksi tanpa database
        const config = { ...dbConfig };
        delete config.database;
        
        connection = await mysql.createConnection(config);
        console.log(`🔍 Mengecek database '${dbConfig.database}'...`);
        
        const [databases] = await connection.query(
            'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
            [dbConfig.database]
        );
        
        if (databases.length === 0) {
            console.log(`📌 Database '${dbConfig.database}' belum ada, membuat...`);
            await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
            console.log(`✅ Database '${dbConfig.database}' berhasil dibuat`);
        } else {
            console.log(`✅ Database '${dbConfig.database}' sudah ada`);
        }
        
        await connection.end();
        return true;
        
    } catch (error) {
        console.error('❌ Gagal mengecek database:', error.message);
        if (connection) {
            try {
                await connection.end();
            } catch (e) {
                // Ignore
            }
        }
        return false;
    }
}

// ========================================
// MAIN EXECUTION
// ========================================
(async () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║          MIGRASI DATABASE AHP - SPK              ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');

    // Cek database terlebih dahulu
    const dbExists = await checkDatabase();
    if (!dbExists) {
        console.error('❌ Gagal mempersiapkan database');
        process.exit(1);
    }
    console.log('');

    // Jalankan migrasi
    await runMigration();
})();

// Handler untuk uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});