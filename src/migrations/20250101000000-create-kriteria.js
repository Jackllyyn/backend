// migrations/20250101000000-create-kriteria.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_kriteria', {
      id_kriteria: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      nama_kriteria: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      tipe: {
        type: Sequelize.ENUM('benefit', 'cost'),
        defaultValue: 'benefit'
      },
      bobot: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0.000000
      },
      created_at: {
        type: Sequelize.TIMESTAMP,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_kriteria');
  }
};