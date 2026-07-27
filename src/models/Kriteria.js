// backend/src/models/Kriteria.js
const { query } = require('../config/database');

class Kriteria {
    // Get all kriteria
    static async getAll() {
        const sql = 'SELECT * FROM tbl_kriteria ORDER BY id_kriteria';
        return await query(sql);
    }

    // Get kriteria by ID
    static async getById(id) {
        const sql = 'SELECT * FROM tbl_kriteria WHERE id_kriteria = ?';
        const results = await query(sql, [id]);
        return results[0] || null;
    }

    // Create new kriteria
    static async create(data) {
        const { nama_kriteria, tipe = 'benefit' } = data;
        const sql = 'INSERT INTO tbl_kriteria (nama_kriteria, tipe) VALUES (?, ?)';
        const result = await query(sql, [nama_kriteria, tipe]);
        return result.insertId;
    }

    // Update kriteria
    static async update(id, data) {
        const { nama_kriteria, tipe, bobot } = data;
        const sql = 'UPDATE tbl_kriteria SET nama_kriteria = ?, tipe = ?, bobot = ? WHERE id_kriteria = ?';
        await query(sql, [nama_kriteria, tipe, bobot, id]);
        return true;
    }

    // Delete kriteria
    static async delete(id) {
        const sql = 'DELETE FROM tbl_kriteria WHERE id_kriteria = ?';
        await query(sql, [id]);
        return true;
    }
}

module.exports = Kriteria;