import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Cliente extends Model {}

Cliente.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documento: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    telefono: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Cliente',
    tableName: 'clientes',
    indexes: [
      { unique: true, fields: ['documento'] },
      { fields: ['email'] },
      { fields: ['nombre'] },
    ],
    hooks: {
      beforeValidate: (cliente) => {
        if (cliente.email) {
          cliente.email = cliente.email.trim().toLowerCase();
        }
        if (cliente.nombre) {
          cliente.nombre = cliente.nombre.trim();
        }
        if (cliente.documento) {
          cliente.documento = cliente.documento.trim();
        }
      },
    },
  }
);

export default Cliente;
