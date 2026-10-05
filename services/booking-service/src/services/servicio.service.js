import { Servicio, PaqueteServicio } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.util.js';

class ServicioService {
  /**
   * Obtiene la lista de servicios individuales.
   * @param {Object} options - { all: boolean, estado: string }
   */
  static async getAll(options = {}) {
    const { all = false, estado = null } = options;
    const where = {};

    if (!all && !estado) {
      where.estado = 'ACTIVO';
    } else if (estado && estado !== 'ALL') {
      where.estado = estado;
    }

    return await Servicio.findAll({
      where,
      order: [['nombre', 'ASC']],
    });
  }

  /**
   * Obtiene un servicio individual por su ID.
   * @param {string} id
   */
  static async getById(id) {
    const servicio = await Servicio.findByPk(id);
    if (!servicio) {
      throw new NotFoundError('Servicio individual no encontrado.');
    }
    return servicio;
  }

  /**
   * Crea un nuevo servicio individual (Leaf en el Patrón Composite).
   */
  static async create(data) {
    const { nombre, precio, descripcion, estado = 'ACTIVO' } = data;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new BadRequestError('El nombre del servicio es obligatorio.');
    }

    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      throw new BadRequestError('El precio del servicio debe ser un número mayor o igual a 0.');
    }

    return await Servicio.create({
      nombre: nombre.trim(),
      precio: +precioNum.toFixed(2),
      descripcion: descripcion ? String(descripcion).trim() : null,
      estado: estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
    });
  }

  /**
   * Actualiza los datos de un servicio existente.
   */
  static async update(id, data) {
    const servicio = await Servicio.findByPk(id);
    if (!servicio) {
      throw new NotFoundError('Servicio no encontrado para actualizar.');
    }

    const { nombre, precio, descripcion, estado } = data;
    const updatePayload = {};

    if (nombre !== undefined) {
      if (!nombre || !String(nombre).trim()) {
        throw new BadRequestError('El nombre del servicio no puede estar vacío.');
      }
      updatePayload.nombre = String(nombre).trim();
    }

    if (precio !== undefined) {
      const precioNum = Number(precio);
      if (!Number.isFinite(precioNum) || precioNum < 0) {
        throw new BadRequestError('El precio del servicio debe ser mayor o igual a 0.');
      }
      updatePayload.precio = +precioNum.toFixed(2);
    }

    if (descripcion !== undefined) {
      updatePayload.descripcion = descripcion ? String(descripcion).trim() : null;
    }

    if (estado !== undefined) {
      updatePayload.estado = estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
    }

    await servicio.update(updatePayload);
    return servicio;
  }

  /**
   * Alterna el estado activo/inactivo de un servicio.
   */
  static async toggleStatus(id, newStatus = null) {
    const servicio = await Servicio.findByPk(id);
    if (!servicio) {
      throw new NotFoundError('Servicio no encontrado.');
    }

    if (newStatus && (newStatus === 'ACTIVO' || newStatus === 'INACTIVO')) {
      servicio.estado = newStatus;
    } else {
      servicio.estado = servicio.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    }

    await servicio.save();
    return servicio;
  }

  /**
   * Elimina un servicio si no está asignado a ningún paquete. De lo contrario lo desactiva.
   */
  static async delete(id) {
    const servicio = await Servicio.findByPk(id);
    if (!servicio) {
      throw new NotFoundError('Servicio no encontrado.');
    }

    const enPaquetes = await PaqueteServicio.count({
      where: { servicio_id: id },
    });

    if (enPaquetes > 0) {
      servicio.estado = 'INACTIVO';
      await servicio.save();
      return {
        deleted: false,
        deactivated: true,
        message: 'El servicio está asignado a uno o más paquetes. Se ha marcado como inactivo para preservar la integridad de los paquetes.',
        data: servicio,
      };
    }

    await servicio.destroy();
    return {
      deleted: true,
      deactivated: false,
      message: 'Servicio eliminado correctamente.',
    };
  }
}

export default ServicioService;
