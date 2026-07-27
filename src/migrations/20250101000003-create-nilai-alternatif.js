// migrations/20250101000003-create-nilai-alternatif.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_nilai_alternatif', {
      id_nilai: {
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
      id_sub: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_sub_kriteria',
          key: 'id_sub'
        },
        onDelete: 'CASCADE'
      },
      nilai: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.00
      },
      created_at: {
        type: Sequelize.TIMESTAMP,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_nilai_alternatif');
  }
};