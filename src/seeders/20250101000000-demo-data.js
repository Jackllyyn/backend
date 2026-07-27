'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
    up: async (queryInterface) => {
        // 1. Kriteria
        await queryInterface.bulkInsert('tbl_kriteria', [
            { nama_kriteria: 'Kesesuaian Genre', tipe: 'benefit', bobot: 0 },
            { nama_kriteria: 'Tahun Terbit', tipe: 'benefit', bobot: 0 },
            { nama_kriteria: 'Popularitas', tipe: 'benefit', bobot: 0 },
            { nama_kriteria: 'Rating', tipe: 'benefit', bobot: 0 }
        ]);

        // 2. Sub Kriteria
        await queryInterface.bulkInsert('tbl_sub_kriteria', [
            // Kesesuaian Genre (id_kriteria = 1)
            { id_kriteria: 1, nama_sub: 'Sangat Sesuai', nilai: 0.6333, bobot_global: 0 },
            { id_kriteria: 1, nama_sub: 'Cukup Sesuai', nilai: 0.2604, bobot_global: 0 },
            { id_kriteria: 1, nama_sub: 'Kurang Sesuai', nilai: 0.1063, bobot_global: 0 },
            // Tahun Terbit (id_kriteria = 2)
            { id_kriteria: 2, nama_sub: '< 5 Tahun', nilai: 0.6479, bobot_global: 0 },
            { id_kriteria: 2, nama_sub: '6 - 10 Tahun', nilai: 0.2299, bobot_global: 0 },
            { id_kriteria: 2, nama_sub: '> 10 Tahun', nilai: 0.1222, bobot_global: 0 },
            // Popularitas (id_kriteria = 3)
            { id_kriteria: 3, nama_sub: 'Sangat Sering Dipinjam', nilai: 0.6860, bobot_global: 0 },
            { id_kriteria: 3, nama_sub: 'Cukup Sering Dipinjam', nilai: 0.2120, bobot_global: 0 },
            { id_kriteria: 3, nama_sub: 'Jarang Dipinjam', nilai: 0.1020, bobot_global: 0 },
            // Rating (id_kriteria = 4)
            { id_kriteria: 4, nama_sub: '4.5 - 5.0', nilai: 0.6434, bobot_global: 0 },
            { id_kriteria: 4, nama_sub: '3.5 - 4.4', nilai: 0.2828, bobot_global: 0 },
            { id_kriteria: 4, nama_sub: '< 3.5', nilai: 0.0738, bobot_global: 0 }
        ]);

        // 3. Pairwise Sub (Konsisten)
        await queryInterface.bulkInsert('tbl_pairwise_sub', [
            // Kesesuaian Genre (id_kriteria = 1)
            { id_kriteria: 1, sub_1: 1, sub_2: 2, nilai: 3 },
            { id_kriteria: 1, sub_1: 1, sub_2: 3, nilai: 5 },
            { id_kriteria: 1, sub_1: 2, sub_2: 3, nilai: 3 },
            // Tahun Terbit (id_kriteria = 2)
            { id_kriteria: 2, sub_1: 4, sub_2: 5, nilai: 3 },
            { id_kriteria: 2, sub_1: 4, sub_2: 6, nilai: 5 },
            { id_kriteria: 2, sub_1: 5, sub_2: 6, nilai: 3 },
            // Popularitas (id_kriteria = 3)
            { id_kriteria: 3, sub_1: 7, sub_2: 8, nilai: 3 },
            { id_kriteria: 3, sub_1: 7, sub_2: 9, nilai: 5 },
            { id_kriteria: 3, sub_1: 8, sub_2: 9, nilai: 3 },
            // Rating (id_kriteria = 4)
            { id_kriteria: 4, sub_1: 10, sub_2: 11, nilai: 3 },
            { id_kriteria: 4, sub_1: 10, sub_2: 12, nilai: 5 },
            { id_kriteria: 4, sub_1: 11, sub_2: 12, nilai: 3 }
        ]);

        // 4. Alternatif (Buku)
        await queryInterface.bulkInsert('tbl_alternatif', [
            { judul_buku: 'Atomic Habits', penulis: 'James Clear', penerbit: 'Penguin Random House', stok: 5 },
            { judul_buku: 'Laskar Pelangi', penulis: 'Andrea Hirata', penerbit: 'Bentang Pustaka', stok: 3 },
            { judul_buku: 'Filosofi Teras', penulis: 'Henry Manampiring', penerbit: 'Buku Kompas', stok: 4 },
            { judul_buku: 'Bumi Manusia', penulis: 'Pramoedya Ananta Toer', penerbit: 'Hasta Mitra', stok: 2 },
            { judul_buku: 'The Psychology of Money', penulis: 'Morgan Housel', penerbit: 'Harriman House', stok: 3 },
            { judul_buku: 'Laut Bercerita', penulis: 'Leila S. Chudori', penerbit: 'KPG', stok: 4 },
            { judul_buku: 'Madilog', penulis: 'Tan Malaka', penerbit: 'Widjaya', stok: 1 },
            { judul_buku: 'Rich Dad Poor Dad', penulis: 'Robert T. Kiyosaki', penerbit: 'Plata Publishing', stok: 3 },
            { judul_buku: 'Sebuah Seni untuk Bersikap Bodo Amat', penulis: 'Mark Manson', penerbit: 'HarperOne', stok: 4 },
            { judul_buku: 'Hujan', penulis: 'Tere Liye', penerbit: 'Gramedia Pustaka Utama', stok: 5 }
        ]);

        // 5. User Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await queryInterface.bulkInsert('tbl_user', [
            {
                username: 'admin',
                password: hashedPassword,
                nama_lengkap: 'Administrator',
                email: 'admin@perpustakaan.brebes.go.id',
                role: 'superadmin'
            }
        ]);
    },

    down: async (queryInterface) => {
        await queryInterface.bulkDelete('tbl_user', null, {});
        await queryInterface.bulkDelete('tbl_hasil_ahp', null, {});
        await queryInterface.bulkDelete('tbl_pairwise_sub', null, {});
        await queryInterface.bulkDelete('tbl_pairwise_kriteria', null, {});
        await queryInterface.bulkDelete('tbl_nilai_alternatif', null, {});
        await queryInterface.bulkDelete('tbl_alternatif', null, {});
        await queryInterface.bulkDelete('tbl_sub_kriteria', null, {});
        await queryInterface.bulkDelete('tbl_kriteria', null, {});
    }
};