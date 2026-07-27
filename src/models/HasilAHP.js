// backend/src/models/HasilAHP.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class HasilAHP extends Model {
        static associate(models) {
            HasilAHP.belongsTo(models.Alternatif, { 
                foreignKey: 'id_alternatif', 
                as: 'alternatif' 
            });
        }
    }

    HasilAHP.init({
        id_hasil: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_alternatif: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        skor_total: {
            type: DataTypes.DECIMAL(10, 6),
            allowNull: false
        },
        peringkat: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'HasilAHP',
        tableName: 'tbl_hasil_ahp',
        timestamps: true,
        createdAt: 'tanggal_perhitungan',
        updatedAt: false
    });

    return HasilAHP;
};