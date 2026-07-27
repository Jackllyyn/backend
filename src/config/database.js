// backend/src/config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load .env dari root backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Buat pool connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_ahp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Fungsi query
const query = async (sql, params) => {
    const [rows] = await pool.query(sql, params);
    return rows;
};

// Ekspor
module.exports = { pool, query };