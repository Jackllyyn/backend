// migrations/20250101000001-create-sub-kriteria.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_sub_kriteria', {
      id_sub: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_kriteria: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_kriteria',
          key: 'id_kriteria'
        },
        onDelete: 'CASCADE'
      },
      nama_sub: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      bobot_sub: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0.000000
      },
      bobot_global: {
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
    await queryInterface.dropTable('tbl_sub_kriteria');
  }
};