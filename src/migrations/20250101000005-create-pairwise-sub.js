// migrations/20250101000005-create-pairwise-sub.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_pairwise_sub', {
      id_pairwise: {
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
      sub_1: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_sub_kriteria',
          key: 'id_sub'
        },
        onDelete: 'CASCADE'
      },
      sub_2: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'tbl_sub_kriteria',
          key: 'id_sub'
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
    await queryInterface.dropTable('tbl_pairwise_sub');
  }
};