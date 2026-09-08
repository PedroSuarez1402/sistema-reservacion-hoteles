import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Reservation from './Reservation.js';

class Room extends Model {}

Room.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    numero: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    tipo: {
      type: DataTypes.ENUM('SENCILLA', 'DOBLE', 'SUITE'),
      allowNull: false,
    },
    precio_noche: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVA', 'MANTENIMIENTO', 'ELIMINADA'),
      defaultValue: 'ACTIVA',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Room',
    tableName: 'habitaciones',
    hooks: {
      async afterDestroy(instance) {
        try {
          const { deleteRoomFolder } = await import('../services/storage.service.js');
          if (instance?.id) deleteRoomFolder(instance.id);
        } catch {
          // ignore
        }
      },
    },
  }
);

Room.hasMany(Reservation, {
  foreignKey: 'habitacion_id',
  as: 'reservaciones',
});

Reservation.belongsTo(Room, {
  foreignKey: 'habitacion_id',
  as: 'habitacion',
});

export default Room;
