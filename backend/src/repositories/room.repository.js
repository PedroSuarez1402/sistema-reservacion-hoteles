import { Op } from 'sequelize';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';
import RoomImage from '../models/RoomImage.js';

const includeImagesQuery = {
  model: RoomImage,
  as: 'imagenes',
  order: [
    ['orden', 'ASC'],
    ['createdAt', 'ASC'],
  ],
};

class RoomRepository {
  static async create(data) {
    return await Room.create(data);
  }

  static async getAll(options = {}) {
    const { where = {}, order = [['numero', 'ASC']] } = options;
    return await Room.findAll({
      where,
      order,
      include: [includeImagesQuery],
    });
  }

  static async getById(id) {
    return await Room.findByPk(id, { include: [includeImagesQuery] });
  }

  static async findById(id) {
    return await this.getById(id);
  }

  static async getByNumero(numero) {
    return await Room.findOne({ where: { numero }, include: [includeImagesQuery] });
  }

  static async update(id, data) {
    const room = await this.getById(id);
    if (!room) return null;
    return await room.update(data);
  }

  static async delete(id) {
    const room = await this.getById(id);
    if (!room) return null;
    await room.destroy();
    return room;
  }

  static async exists(id) {
    const count = await Room.count({ where: { id } });
    return count > 0;
  }

  static async getAvailableRooms(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const reservedRoomIds = await Reservation.findAll({
      where: {
        estado: { [Op.in]: ['PENDIENTE', 'CONFIRMADA'] },
        fecha_inicio: { [Op.lt]: fin },
        fecha_fin: { [Op.gt]: inicio },
      },
      attributes: ['habitacion_id'],
    });

    const excludedIds = reservedRoomIds.map((r) => r.habitacion_id);

    const whereClause = { estado: 'ACTIVA' };
    if (excludedIds.length > 0) {
      whereClause.id = { [Op.notIn]: excludedIds };
    }

    return await Room.findAll({
      where: whereClause,
      order: [['numero', 'ASC']],
      include: [includeImagesQuery],
    });
  }

  static async checkAvailability(habitacion_id, fechaInicio, fechaFin, excludeReservationId = null) {
    const room = await this.getById(habitacion_id);
    if (!room) return false;
    if (room.estado !== 'ACTIVA') return false;

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const whereClause = {
      habitacion_id,
      estado: { [Op.in]: ['PENDIENTE', 'CONFIRMADA'] },
      fecha_inicio: { [Op.lt]: fin },
      fecha_fin: { [Op.gt]: inicio },
    };

    if (excludeReservationId) {
      whereClause.id = { [Op.ne]: excludeReservationId };
    }

    const count = await Reservation.count({ where: whereClause });
    return count === 0;
  }
}

export default RoomRepository;
