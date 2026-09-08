import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class RoomImage extends Model {}

RoomImage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    habitacion_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'habitaciones',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    ruta_original: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    ruta_web: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    ruta_miniatura: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    nombre_original: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tamano_original_bytes: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    tipo_mime: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    es_principal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    orden: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'RoomImage',
    tableName: 'imagenes_habitacion',
    indexes: [
      { fields: ['habitacion_id'] },
      { fields: ['orden'] },
      { fields: ['es_principal'] },
      { fields: ['habitacion_id', 'es_principal'] },
    ],
  }
);

export default RoomImage;
