import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

// Modelo Sequelize Etiqueta
class Tag extends Model {}

Tag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Tag',
    tableName: 'etiquetas',
  }
);

export default Tag;
