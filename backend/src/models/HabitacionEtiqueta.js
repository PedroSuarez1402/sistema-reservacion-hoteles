import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

// Modelo Sequelize Tabla pivote Habitación-Etiqueta
class HabitacionEtiqueta extends Model {}

HabitacionEtiqueta.init(
  {
    habitacion_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'habitaciones',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    etiqueta_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'etiquetas',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'HabitacionEtiqueta',
    tableName: 'habitaciones_etiquetas',
    timestamps: false,
  }
);

export default HabitacionEtiqueta;
