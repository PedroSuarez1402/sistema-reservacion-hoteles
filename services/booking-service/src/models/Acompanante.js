import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Acompanante extends Model {}

Acompanante.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cliente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id',
      },
    },
    reserva_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'reservaciones',
        key: 'id',
      },
    },
    documento: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    parentesco: {
      type: DataTypes.STRING(50),
      defaultValue: 'Familiar',
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Acompanante',
    tableName: 'acompanantes',
    indexes: [
      { fields: ['cliente_id'] },
      { fields: ['reserva_id'] },
      { fields: ['documento'] },
    ],
    hooks: {
      beforeValidate: (acompanante) => {
        if (acompanante.nombre) {
          acompanante.nombre = acompanante.nombre.trim();
        }
        if (acompanante.documento) {
          acompanante.documento = acompanante.documento.trim();
        }
        if (acompanante.parentesco) {
          acompanante.parentesco = acompanante.parentesco.trim();
        }
      },
    },
  }
);

export default Acompanante;
