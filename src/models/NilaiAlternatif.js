// backend/src/models/NilaiAlternatif.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class NilaiAlternatif extends Model {
        static associate(models) {
            NilaiAlternatif.belongsTo(models.Alternatif, { 
                foreignKey: 'id_alternatif', 
                as: 'alternatif' 
            });
            NilaiAlternatif.belongsTo(models.SubKriteria, { 
                foreignKey: 'id_sub', 
                as: 'sub_kriteria' 
            });
        }
    }

    NilaiAlternatif.init({
        id_nilai: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_alternatif: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        id_sub: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'NilaiAlternatif',
        tableName: 'tbl_nilai_alternatif',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return NilaiAlternatif;
};