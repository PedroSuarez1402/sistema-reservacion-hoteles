import { Op } from 'sequelize';
import Reservation from '../models/Reservation.js';
import User from '../models/User.js';
import Room from '../models/Room.js';

class ReservationRepository {
  static async create(data) {
    return await Reservation.create(data);
  }

  static async getAll(options = {}) {
    const {
      where = {},
      order = [['created_at', 'DESC']],
      includeUser = true,
      includeRoom = true,
      limit,
      offset,
    } = options;

    const include = [];
    if (includeUser) {
      include.push({
        model: User,
        as: undefined,
        attributes: ['id', 'nombre', 'email', 'rol'],
      });
    }
    if (includeRoom) {
      include.push({
        model: Room,
        as: undefined,
        attributes: ['id', 'numero', 'tipo', 'precio_noche', 'estado'],
      });
    }

    return await Reservation.findAll({ where, order, include, limit, offset });
  }

  static async getById(id, options = {}) {
    const { includeUser = true, includeRoom = true } = options;
    const include = [];
    if (includeUser) {
      include.push({
        model: User,
        attributes: ['id', 'nombre', 'email', 'rol'],
      });
    }
    if (includeRoom) {
      include.push({
        model: Room,
        attributes: ['id', 'numero', 'tipo', 'precio_noche', 'estado'],
      });
    }
    return await Reservation.findByPk(id, { include });
  }

  static async findById(id, options) {
    return await this.getById(id, options);
  }

  static async getByUsuarioId(usuario_id, options = {}) {
    const { order = [['fecha_inicio', 'DESC']], includeRoom = true } = options;
    const include = [];
    if (includeRoom) {
      include.push({
        model: Room,
        attributes: ['id', 'numero', 'tipo', 'precio_noche', 'estado'],
      });
    }
    return await Reservation.findAll({
      where: { usuario_id },
      order,
      include,
    });
  }

  static async getByHabitacionId(habitacion_id, options = {}) {
    const { order = [['fecha_inicio', 'DESC']], includeUser = true } = options;
    const include = [];
    if (includeUser) {
      include.push({
        model: User,
        attributes: ['id', 'nombre', 'email', 'rol'],
      });
    }
    return await Reservation.findAll({
      where: { habitacion_id },
      order,
      include,
    });
  }

  static async update(id, data) {
    const reservation = await this.getById(id, { includeUser: false, includeRoom: false });
    if (!reservation) return null;
    return await reservation.update(data);
  }

  static async delete(id) {
    const reservation = await this.getById(id, { includeUser: false, includeRoom: false });
    if (!reservation) return null;
    await reservation.destroy();
    return reservation;
  }

  static async exists(id) {
    const count = await Reservation.count({ where: { id } });
    return count > 0;
  }

  static async updateStatus(id, estado) {
    const reservation = await this.getById(id, { includeUser: false, includeRoom: false });
    if (!reservation) return null;
    reservation.estado = estado;
    await reservation.save();
    return await this.getById(id);
  }

  static async checkAvailability(habitacion_id, fechaInicio, fechaFin, excludeReservationId = null) {
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

  static async findOverlapping(habitacion_id, fechaInicio, fechaFin, excludeReservationId = null) {
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

    return await Reservation.findAll({ where: whereClause });
  }

  static async getByDateRange(fechaInicio, fechaFin, options = {}) {
    const {
      estado,
      habitacion_id,
      includeUser = true,
      includeRoom = true,
      order = [['fecha_inicio', 'ASC']],
    } = options;

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const where = {
      fecha_inicio: { [Op.lte]: fin },
      fecha_fin: { [Op.gte]: inicio },
    };
    if (estado) where.estado = estado;
    if (habitacion_id) where.habitacion_id = habitacion_id;

    const include = [];
    if (includeUser) {
      include.push({ model: User, attributes: ['id', 'nombre', 'email', 'rol'] });
    }
    if (includeRoom) {
      include.push({ model: Room, attributes: ['id', 'numero', 'tipo', 'precio_noche', 'estado'] });
    }

    return await Reservation.findAll({ where, include, order });
  }

  static async countByEstado(estado) {
    const where = estado ? { estado } : {};
    return await Reservation.count({ where });
  }

  static async getStats() {
    const [pendientes, confirmadas, canceladas, finalizadas, total] = await Promise.all([
      this.countByEstado('PENDIENTE'),
      this.countByEstado('CONFIRMADA'),
      this.countByEstado('CANCELADA'),
      this.countByEstado('FINALIZADA'),
      Reservation.count(),
    ]);
    return { pendientes, confirmadas, canceladas, finalizadas, total };
  }
}

export default ReservationRepository;
