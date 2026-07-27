// backend/src/models/User.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // tidak ada relasi khusus
        }
    }

    User.init({
        id_user: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        nama_lengkap: {
            type: DataTypes.STRING(100)
        },
        email: {
            type: DataTypes.STRING(100)
        },
        role: {
            type: DataTypes.ENUM('admin', 'superadmin'),
            defaultValue: 'admin'
        }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'tbl_user',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return User;
};