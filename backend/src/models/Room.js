import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../config/database.js';
import Reservation from './Reservation.js';

class Room extends Model {
  static async findAvailableRooms(fechaInicio, fechaFin) {
    const reservedRoomIds = await Reservation.findAll({
      where: {
        estado: {
          [Op.in]: ['PENDIENTE', 'CONFIRMADA'],
        },
        [Op.or]: [
          {
            fecha_inicio: {
              [Op.lt]: fechaFin,
            },
            fecha_fin: {
              [Op.gt]: fechaInicio,
            },
          },
        ],
      },
      attributes: ['habitacion_id'],
    });

    const excludedIds = reservedRoomIds.map((r) => r.habitacion_id);

    const whereClause = {
      estado: 'ACTIVA',
    };

    if (excludedIds.length > 0) {
      whereClause.id = {
        [Op.notIn]: excludedIds,
      };
    }

    return Room.findAll({
      where: whereClause,
    });
  }
}

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
      validate: {
        isDecimal: true,
        min: {
          args: [0.01],
          msg: 'El precio por noche debe ser mayor a 0',
        },
      },
    },
    estado: {
      type: DataTypes.ENUM('ACTIVA', 'MANTENIMIENTO'),
      defaultValue: 'ACTIVA',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Room',
    tableName: 'habitaciones',
  }
);

export default Room;
