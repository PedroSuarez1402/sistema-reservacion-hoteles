import { Op } from 'sequelize';
import { Cliente, Acompanante, Reservation } from '../models/index.js';

class ClienteRepository {
  static async create(data) {
    return await Cliente.create(data);
  }

  static async getAll(options = {}) {
    const {
      keyword = '',
      limit,
      offset,
      order = [['created_at', 'DESC']],
      includeAcompanantes = true,
    } = options;

    const where = {};
    if (keyword && String(keyword).trim().length > 0) {
      const term = `%${String(keyword).trim()}%`;
      where[Op.or] = [
        { documento: { [Op.like]: term } },
        { nombre: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { telefono: { [Op.like]: term } },
      ];
    }

    const include = [];
    if (includeAcompanantes) {
      include.push({
        model: Acompanante,
        as: 'acompanantes',
        attributes: ['id', 'documento', 'nombre', 'parentesco', 'telefono'],
      });
    }
    include.push({
      model: Reservation,
      as: 'reservaciones',
      attributes: ['id', 'precio_total', 'estado', 'fecha_inicio', 'fecha_fin'],
      required: false,
    });

    const { count, rows } = await Cliente.findAndCountAll({
      where,
      order,
      include,
      limit,
      offset,
      distinct: true,
    });

    return { total: count, items: rows };
  }

  static async getById(id, options = {}) {
    const { includeAcompanantes = true, includeReservations = true } = options;
    const include = [];

    if (includeAcompanantes) {
      include.push({
        model: Acompanante,
        as: 'acompanantes',
        attributes: ['id', 'documento', 'nombre', 'parentesco', 'telefono', 'reserva_id'],
      });
    }

    if (includeReservations) {
      include.push({
        model: Reservation,
        as: 'reservaciones',
        attributes: ['id', 'habitacion_id', 'fecha_inicio', 'fecha_fin', 'precio_total', 'estado', 'metodo_pago', 'anticipo'],
        limit: 10,
        order: [['created_at', 'DESC']],
      });
    }

    return await Cliente.findByPk(id, { include });
  }

  static async getByDocumento(documento) {
    if (!documento) return null;
    return await Cliente.findOne({
      where: { documento: String(documento).trim() },
      include: [
        {
          model: Acompanante,
          as: 'acompanantes',
          attributes: ['id', 'documento', 'nombre', 'parentesco', 'telefono'],
        },
      ],
    });
  }

  static async getByEmail(email) {
    if (!email) return null;
    return await Cliente.findOne({
      where: { email: String(email).trim().toLowerCase() },
      include: [
        {
          model: Acompanante,
          as: 'acompanantes',
          attributes: ['id', 'documento', 'nombre', 'parentesco', 'telefono'],
        },
      ],
    });
  }

  static async update(id, data) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return null;
    return await cliente.update(data);
  }

  static async delete(id) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return null;
    await cliente.destroy();
    return cliente;
  }

  static async addAcompanante(clienteId, data) {
    return await Acompanante.create({
      ...data,
      cliente_id: clienteId,
    });
  }

  static async getAcompanantesByClienteId(clienteId) {
    return await Acompanante.findAll({
      where: { cliente_id: clienteId },
      order: [['created_at', 'ASC']],
    });
  }

  static async deleteAcompanante(acompananteId) {
    const a = await Acompanante.findByPk(acompananteId);
    if (!a) return null;
    await a.destroy();
    return a;
  }
}

export default ClienteRepository;
