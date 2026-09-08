import { Op, fn, col, literal } from 'sequelize';
import User from '../models/User.js';
import Reservation from '../models/Reservation.js';

const SAFE_ATTRIBUTES = ['id', 'nombre', 'email', 'rol', 'createdAt', 'updatedAt'];

// Repositorio acceso datos Usuarios
class UserRepository {
  // Crea nuevo registro usuario en BD
  static async create(data) {
    return await User.create(data);
  }

  // Obtiene lista usuarios con opciones where y order (sin paginar)
  static async getAll(options = {}) {
    const { where = {}, order = [['created_at', 'DESC']] } = options;
    return await User.findAll({
      attributes: SAFE_ATTRIBUTES,
      where,
      order,
    });
  }

  static buildWhereFilters({ keyword = null, rol = null } = {}) {
    const where = {};
    if (keyword && keyword.trim().length > 0) {
      const kw = `%${keyword.trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.like]: kw } },
        { email: { [Op.like]: kw } },
      ];
    }
    if (rol && ['HUESPED', 'ADMIN', 'RECEPCION'].includes(String(rol))) {
      where.rol = String(rol);
    }
    return where;
  }

  // Lista paginada de usuarios
  static async findAndCountAllPaginated({ keyword, page = 1, limit = 10, rol } = {}) {
    const where = this.buildWhereFilters({ keyword, rol });
    const pageNum = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;
    const safeLimit = Math.min(limitNum, 100);
    const offset = (pageNum - 1) * safeLimit;
    const order = [['created_at', 'DESC']];

    const result = await User.findAndCountAll({
      attributes: SAFE_ATTRIBUTES,
      where,
      order,
      limit: safeLimit,
      offset,
    });
    return {
      rows: result.rows,
      count: result.count,
      page: pageNum,
      limit: safeLimit,
    };
  }

  // Summary: contadores + última reserva
  static async getSummaryForUserId(id) {
    if (!id) return null;
    const whereReserva = { usuario_id: id };
    const [count, sumRow, ultima] = await Promise.all([
      Reservation.count({ where: whereReserva }),
      Reservation.findOne({
        where: whereReserva,
        attributes: [[fn('SUM', col('precio_total')), 'total']],
        raw: true,
      }),
      Reservation.findOne({
        where: whereReserva,
        order: [['fecha_inicio', 'DESC']],
        attributes: ['fecha_inicio', 'estado'],
        raw: true,
      }),
    ]);
    const ingreso = sumRow && sumRow.total !== null ? Number(sumRow.total) : null;
    return {
      reservaciones_count: Number(count) || 0,
      ingreso_total: ingreso,
      ultima_reserva_fecha: ultima ? ultima.fecha_inicio : null,
      ultima_reserva_estado: ultima ? ultima.estado : null,
    };
  }

  static async getSummaryMapForUserIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return new Map();
    const rows = await Reservation.findAll({
      where: { usuario_id: { [Op.in]: ids } },
      attributes: [
        'usuario_id',
        [fn('COUNT', col('id')), 'cnt'],
        [fn('SUM', col('precio_total')), 'sum'],
        [literal(
          `SUBSTRING_INDEX(GROUP_CONCAT(CONCAT(fecha_inicio,'|',estado) ORDER BY fecha_inicio DESC SEPARATOR '||'), '||', 1)`
        ), 'ult_raw'],
      ],
      group: ['usuario_id'],
      raw: true,
    });
    const map = new Map();
    for (const r of rows) {
      const uid = r.usuario_id;
      let fecha = null;
      let estado = null;
      if (r.ult_raw && typeof r.ult_raw === 'string') {
        const parts = r.ult_raw.split('|');
        fecha = parts[0] || null;
        estado = parts[1] || null;
      }
      const total = r.sum !== null && r.sum !== undefined ? Number(r.sum) : null;
      map.set(uid, {
        reservaciones_count: Number(r.cnt) || 0,
        ingreso_total: total,
        ultima_reserva_fecha: fecha,
        ultima_reserva_estado: estado,
      });
    }
    return map;
  }

  // Busca usuario por clave primaria ID
  static async getById(id) {
    return await User.findByPk(id, { attributes: SAFE_ATTRIBUTES });
  }

  // Alias findById = getById
  static async findById(id) {
    return await this.getById(id);
  }

  // Busca usuario por email normalizado
  static async getByEmail(email) {
    return await User.findOne({
      attributes: [...SAFE_ATTRIBUTES, 'password'],
      where: { email: String(email).trim().toLowerCase() },
    });
  }

  // Actualiza datos usuario existente por ID
  static async update(id, data) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update(data);
    return await this.getById(id);
  }

  // Elimina usuario por ID (destroy)
  static async delete(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.destroy();
    return user;
  }

  // Verifica si existe usuario por ID
  static async exists(id) {
    const count = await User.count({ where: { id } });
    return count > 0;
  }

  // Verifica email único, excluyendo ID opcional
  static async emailExists(email, excludeId = null) {
    const where = { email: String(email).trim().toLowerCase() };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const count = await User.count({ where });
    return count > 0;
  }
}

export default UserRepository;

