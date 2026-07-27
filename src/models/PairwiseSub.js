// backend/src/models/PairwiseSub.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PairwiseSub extends Model {
        static associate(models) {
            PairwiseSub.belongsTo(models.Kriteria, { 
                foreignKey: 'id_kriteria', 
                as: 'kriteria' 
            });
            PairwiseSub.belongsTo(models.SubKriteria, { 
                foreignKey: 'sub_1', 
                as: 'sub1' 
            });
            PairwiseSub.belongsTo(models.SubKriteria, { 
                foreignKey: 'sub_2', 
                as: 'sub2' 
            });
        }
    }

    PairwiseSub.init({
        id_pairwise: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_kriteria: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sub_1: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sub_2: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        nilai: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'PairwiseSub',
        tableName: 'tbl_pairwise_sub',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return PairwiseSub;
};