import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

// Modelo Sequelize Paquete Turístico
class Paquete extends Model {}

Paquete.init(
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
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    descuento_porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO'),
      defaultValue: 'ACTIVO',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Paquete',
    tableName: 'paquetes',
    timestamps: true,
  }
);

export default Paquete;
