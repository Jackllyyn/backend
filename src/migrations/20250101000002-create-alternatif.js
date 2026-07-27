// migrations/20250101000002-create-alternatif.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_alternatif', {
      id_alternatif: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      judul_buku: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      penulis: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      penerbit: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      tahun_terbit: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      stok: {
        type: Sequelize.INTEGER(11),
        defaultValue: 0
      },
      gambar: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.TIMESTAMP,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_alternatif');
  }
};