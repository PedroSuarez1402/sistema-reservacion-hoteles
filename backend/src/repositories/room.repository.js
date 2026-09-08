import { Op } from 'sequelize';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';
import RoomImage from '../models/RoomImage.js';
import Tag from '../models/Tag.js';

const includeImagesQuery = {
  model: RoomImage,
  as: 'imagenes',
  order: [
    ['orden', 'ASC'],
    ['createdAt', 'ASC'],
  ],
};

const includeEtiquetasQuery = {
  model: Tag,
  as: 'etiquetas',
  attributes: ['id', 'nombre', 'descripcion'],
  through: { attributes: [] },
  order: [['nombre', 'ASC']],
};

const defaultIncludes = [includeImagesQuery, includeEtiquetasQuery];

// Repositorio acceso datos Habitaciones
class RoomRepository {
  // Crea nueva habitación en BD
  static async create(data) {
    return await Room.create(data);
  }

  // Obtiene todas habitaciones con includes imágenes y etiquetas
  static async getAll(options = {}) {
    const { where = {}, order = [['numero', 'ASC']] } = options;
    return await Room.findAll({
      where,
      order,
      include: defaultIncludes,
    });
  }

  // Busca habitación por ID con includes asociados
  static async getById(id) {
    return await Room.findByPk(id, { include: defaultIncludes });
  }

  // Alias findById = getById
  static async findById(id) {
    return await this.getById(id);
  }

  // Busca habitación por número único
  static async getByNumero(numero) {
    return await Room.findOne({ where: { numero }, include: defaultIncludes });
  }

  // Actualiza habitación existente por ID
  static async update(id, data) {
    const room = await this.getById(id);
    if (!room) return null;
    return await room.update(data);
  }

  // Elimina habitación por ID (soft por estado o destroy)
  static async delete(id) {
    const room = await this.getById(id);
    if (!room) return null;
    await room.destroy();
    return room;
  }

  // Verifica existencia habitación por ID
  static async exists(id) {
    const count = await Room.count({ where: { id } });
    return count > 0;
  }

  // Obtiene habitaciones activas no reservadas en rango
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
      include: defaultIncludes,
    });
  }

  // Verifica disponibilidad habitación en rango fechas
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
