import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

// Modelo Sequelize Servicio Adicional
class Servicio extends Model {}

Servicio.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO'),
      defaultValue: 'ACTIVO',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Servicio',
    tableName: 'servicios',
    timestamps: true,
  }
);

export default Servicio;
