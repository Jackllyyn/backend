// migrations/20250101000006-create-hasil-ahp.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_hasil_ahp', {
      id_hasil: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_alternatif: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_alternatif',
          key: 'id_alternatif'
        },
        onDelete: 'CASCADE'
      },
      skor_total: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false
      },
      peringkat: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      tanggal_perhitungan: {
        type: Sequelize.TIMESTAMP,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_hasil_ahp');
  }
};