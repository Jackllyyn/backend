// backend/src/models/PairwiseKriteria.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PairwiseKriteria extends Model {
        static associate(models) {
            PairwiseKriteria.belongsTo(models.Kriteria, { 
                foreignKey: 'id_kriteria_1', 
                as: 'kriteria1' 
            });
            PairwiseKriteria.belongsTo(models.Kriteria, { 
                foreignKey: 'id_kriteria_2', 
                as: 'kriteria2' 
            });
        }
    }

    PairwiseKriteria.init({
        id_pairwise: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        kriteria_1: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        kriteria_2: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        nilai: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'PairwiseKriteria',
        tableName: 'tbl_pairwise_kriteria',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return PairwiseKriteria;
};