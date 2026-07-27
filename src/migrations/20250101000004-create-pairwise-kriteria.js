// migrations/20250101000004-create-pairwise-kriteria.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_pairwise_kriteria', {
      id_pairwise: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      kriteria_1: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_kriteria',
          key: 'id_kriteria'
        },
        onDelete: 'CASCADE'
      },
      kriteria_2: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_kriteria',
          key: 'id_kriteria'
        },
        onDelete: 'CASCADE'
      },
      nilai: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false
      },
      created_at: {
        type: Sequelize.TIMESTAMP,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_pairwise_kriteria');
  }
};