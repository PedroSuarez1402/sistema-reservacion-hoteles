import { Op } from 'sequelize';
import Reservation from '../models/Reservation.js';
import User from '../models/User.js';

const USER_INCLUDE_ATTRS = ['id', 'nombre', 'email', 'rol'];

// Repositorio acceso datos Reservaciones
class ReservationRepository {
  // Crea nueva reservación en BD
  static async create(data) {
    return await Reservation.create(data);
  }

  // Obtiene lista reservaciones con includes usuario (habitación = room-service externo)
  static async getAll(options = {}) {
    const {
      where = {},
      order = [['created_at', 'DESC']],
      includeUser = true,
      limit,
      offset,
    } = options;

    const include = [];
    if (includeUser) {
      include.push({
        model: User,
        as: 'usuario',
        attributes: USER_INCLUDE_ATTRS,
      });
    }

    return await Reservation.findAll({ where, order, include, limit, offset });
  }

  // Obtiene reservación por ID con includes opcionales
  static async getById(id, options = {}) {
    const { includeUser = true } = options;
    const include = [];
    if (includeUser) {
      include.push({
        model: User,
        as: 'usuario',
        attributes: USER_INCLUDE_ATTRS,
      });
    }
    return await Reservation.findByPk(id, { include });
  }

  // Alias findById = getById
  static async findById(id, options) {
    return await this.getById(id, options);
  }

  // Obtiene reservaciones de un usuario por ID
  static async getByUsuarioId(usuario_id, options = {}) {
    const { order = [['fecha_inicio', 'DESC']] } = options;
    const include = [];
    return await Reservation.findAll({
      where: { usuario_id },
      order,
      include,
    });
  }

  // Obtiene reservaciones de una habitación por ID
  static async getByHabitacionId(habitacion_id, options = {}) {
    const { order = [['fecha_inicio', 'DESC']], includeUser = true } = options;
    const include = [];
    if (includeUser) {
      include.push({
        model: User,
        as: 'usuario',
        attributes: USER_INCLUDE_ATTRS,
      });
    }
    return await Reservation.findAll({
      where: { habitacion_id },
      order,
      include,
    });
  }

  // Actualiza reservación existente por ID
  static async update(id, data) {
    const reservation = await this.getById(id, { includeUser: false });
    if (!reservation) return null;
    return await reservation.update(data);
  }

  // Elimina reservación por ID (destroy)
  static async delete(id) {
    const reservation = await this.getById(id, { includeUser: false });
    if (!reservation) return null;
    await reservation.destroy();
    return reservation;
  }

  // Verifica si existe reservación por ID
  static async exists(id) {
    const count = await Reservation.count({ where: { id } });
    return count > 0;
  }

  // Actualiza solo campo estado de reservación
  static async updateStatus(id, estado) {
    const reservation = await this.getById(id, { includeUser: false });
    if (!reservation) return null;
    reservation.estado = estado;
    await reservation.save();
    return await this.getById(id);
  }

  // Verifica disponibilidad: devuelve true si no hay solapamientos
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

  // Busca reservaciones que se solapan en rango fechas
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

  // Obtiene reservaciones dentro de rango fechas dado
  static async getByDateRange(fechaInicio, fechaFin, options = {}) {
    const {
      estado,
      habitacion_id,
      includeUser = true,
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
      include.push({ model: User, as: 'usuario', attributes: USER_INCLUDE_ATTRS });
    }

    return await Reservation.findAll({ where, include, order });
  }

  // Cuenta reservaciones filtradas por estado
  static async countByEstado(estado) {
    const where = estado ? { estado } : {};
    return await Reservation.count({ where });
  }

  // Obtiene estadísticas conteo por cada estado
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
