// backend/src/models/Alternatif.js
const { query } = require('../config/database');

class Alternatif {
    static async getAll() {
        const sql = 'SELECT * FROM tbl_alternatif ORDER BY id_alternatif';
        return await query(sql);
    }

    static async getById(id) {
        const sql = 'SELECT * FROM tbl_alternatif WHERE id_alternatif = ?';
        const results = await query(sql, [id]);
        return results[0] || null;
    }

    static async create(data) {
        const { judul_buku, penulis, penerbit, tahun_terbit, stok = 0 } = data;
        const sql = `INSERT INTO tbl_alternatif (judul_buku, penulis, penerbit, tahun_terbit, stok) 
                     VALUES (?, ?, ?, ?, ?)`;
        const result = await query(sql, [judul_buku, penulis, penerbit, tahun_terbit, stok]);
        return result.insertId;
    }

    static async update(id, data) {
        const { judul_buku, penulis, penerbit, tahun_terbit, stok } = data;
        const sql = `UPDATE tbl_alternatif 
                     SET judul_buku = ?, penulis = ?, penerbit = ?, tahun_terbit = ?, stok = ? 
                     WHERE id_alternatif = ?`;
        await query(sql, [judul_buku, penulis, penerbit, tahun_terbit, stok, id]);
        return true;
    }

    static async delete(id) {
        const sql = 'DELETE FROM tbl_alternatif WHERE id_alternatif = ?';
        await query(sql, [id]);
        return true;
    }

    // Get alternatif with its sub-kriteria values
    static async getWithNilai(id) {
        const sql = `
            SELECT 
                a.*,
                sk.nama_sub,
                sk.id_sub,
                k.nama_kriteria,
                k.id_kriteria
            FROM tbl_alternatif a
            LEFT JOIN tbl_nilai_alternatif na ON a.id_alternatif = na.id_alternatif
            LEFT JOIN tbl_sub_kriteria sk ON na.id_sub = sk.id_sub
            LEFT JOIN tbl_kriteria k ON sk.id_kriteria = k.id_kriteria
            WHERE a.id_alternatif = ?
        `;
        return await query(sql, [id]);
    }
}

module.exports = Alternatif;