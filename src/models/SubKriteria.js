// backend/src/models/SubKriteria.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SubKriteria extends Model {
        static associate(models) {
            SubKriteria.belongsTo(models.Kriteria, { 
                foreignKey: 'id_kriteria', 
                as: 'kriteria' 
            });
            SubKriteria.hasMany(models.NilaiAlternatif, { 
                foreignKey: 'id_sub', 
                as: 'nilai_alternatif' 
            });
            SubKriteria.hasMany(models.PairwiseSub, { 
                foreignKey: 'sub_1', 
                as: 'pairwise_sub1' 
            });
            SubKriteria.hasMany(models.PairwiseSub, { 
                foreignKey: 'sub_2', 
                as: 'pairwise_sub2' 
            });
        }
    }

    SubKriteria.init({
        id_sub: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_kriteria: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        nama_sub: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        nilai: {
            type: DataTypes.DECIMAL(10, 6),
            defaultValue: 0
        },
        bobot_global: {
            type: DataTypes.DECIMAL(10, 6),
            defaultValue: 0
        }
    }, {
        sequelize,
        modelName: 'SubKriteria',
        tableName: 'tbl_sub_kriteria',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return SubKriteria;
};