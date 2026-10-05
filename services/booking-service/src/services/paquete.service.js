import { Op } from 'sequelize';
import { sequelize, Paquete, Servicio, PaqueteServicio, Reservation } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.util.js';
import { PaqueteCompuesto, ServicioSimple } from '../composite/index.js';

class PaqueteService {
  /**
   * Construye el árbol del Patrón Composite a partir de un modelo Paquete de Sequelize.
   * @param {Paquete} paquete
   * @returns {PaqueteCompuesto}
   */
  static construirComposite(paquete) {
    const paqueteComposite = new PaqueteCompuesto({
      paqueteId: paquete.id,
      nombre: paquete.nombre,
      descuentoPorcentaje: Number(paquete.descuento_porcentaje) || 0,
      descripcion: paquete.descripcion || '',
    });

    if (paquete.servicios && Array.isArray(paquete.servicios)) {
      for (const serv of paquete.servicios) {
        const cantidad = serv.PaqueteServicio?.cantidad || serv.cantidad || 1;
        paqueteComposite.agregar(
          new ServicioSimple({
            servicioId: serv.id,
            nombre: serv.nombre,
            precioUnitario: Number(serv.precio),
            cantidad: Number(cantidad) || 1,
            descripcion: serv.descripcion || '',
          })
        );
      }
    }

    return paqueteComposite;
  }

  /**
   * Obtiene la lista de paquetes con sus servicios asociados y su desglose Composite.
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

    const paquetes = await Paquete.findAll({
      where,
      include: [
        {
          model: Servicio,
          as: 'servicios',
          through: { attributes: ['cantidad'] },
        },
      ],
      order: [['nombre', 'ASC']],
    });

    return paquetes.map((p) => {
      const compositeTree = this.construirComposite(p);
      const json = p.toJSON();
      json.composite_desglose = compositeTree.obtenerDesglose();
      return json;
    });
  }

  /**
   * Obtiene un paquete por su ID con su desglose del Patrón Composite.
   * @param {string} id
   */
  static async getById(id) {
    const paquete = await Paquete.findByPk(id, {
      include: [
        {
          model: Servicio,
          as: 'servicios',
          through: { attributes: ['cantidad'] },
        },
      ],
    });

    if (!paquete) {
      throw new NotFoundError('Paquete turístico no encontrado.');
    }

    const compositeTree = this.construirComposite(paquete);
    const json = paquete.toJSON();
    json.composite_desglose = compositeTree.obtenerDesglose();
    return json;
  }

  /**
   * Crea un nuevo paquete turístico junto con sus servicios asociados en la tabla pivote.
   * Utiliza transacciones del ORM Sequelize y valida con el Patrón Composite.
   */
  static async create(data) {
    const { nombre, descripcion, descuento_porcentaje, estado = 'ACTIVO', servicios = [] } = data;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new BadRequestError('El nombre del paquete es obligatorio.');
    }

    const descNum = Number(descuento_porcentaje) || 0;
    if (descNum < 0 || descNum > 100) {
      throw new BadRequestError('El porcentaje de descuento debe estar entre 0 y 100.');
    }

    // Ejecutar creación dentro de transacción Sequelize
    const nuevoPaquete = await sequelize.transaction(async (t) => {
      const paqueteCreado = await Paquete.create(
        {
          nombre: nombre.trim(),
          descripcion: descripcion ? String(descripcion).trim() : null,
          descuento_porcentaje: descNum,
          estado: estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
        },
        { transaction: t }
      );

      if (Array.isArray(servicios) && servicios.length > 0) {
        const pivotRows = servicios
          .filter((s) => s.servicio_id)
          .map((s) => ({
            paquete_id: paqueteCreado.id,
            servicio_id: s.servicio_id,
            cantidad: Math.max(1, Number(s.cantidad) || 1),
          }));

        if (pivotRows.length > 0) {
          await PaqueteServicio.bulkCreate(pivotRows, { transaction: t });
        }
      }

      return paqueteCreado;
    });

    return await this.getById(nuevoPaquete.id);
  }

  /**
   * Actualiza un paquete existente y reemplaza sus asociaciones de servicios si se proveen.
   */
  static async update(id, data) {
    const paqueteExistente = await Paquete.findByPk(id);
    if (!paqueteExistente) {
      throw new NotFoundError('Paquete turístico no encontrado para actualizar.');
    }

    const { nombre, descripcion, descuento_porcentaje, estado, servicios } = data;

    await sequelize.transaction(async (t) => {
      const updatePayload = {};

      if (nombre !== undefined) {
        if (!nombre || !String(nombre).trim()) {
          throw new BadRequestError('El nombre del paquete no puede estar vacío.');
        }
        updatePayload.nombre = String(nombre).trim();
      }

      if (descripcion !== undefined) {
        updatePayload.descripcion = descripcion ? String(descripcion).trim() : null;
      }

      if (descuento_porcentaje !== undefined) {
        const descNum = Number(descuento_porcentaje) || 0;
        if (descNum < 0 || descNum > 100) {
          throw new BadRequestError('El porcentaje de descuento debe estar entre 0 y 100.');
        }
        updatePayload.descuento_porcentaje = descNum;
      }

      if (estado !== undefined) {
        updatePayload.estado = estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
      }

      await paqueteExistente.update(updatePayload, { transaction: t });

      // Si se envían servicios, sincronizar pivote
      if (servicios !== undefined && Array.isArray(servicios)) {
        await PaqueteServicio.destroy({
          where: { paquete_id: id },
          transaction: t,
        });

        const pivotRows = servicios
          .filter((s) => s.servicio_id)
          .map((s) => ({
            paquete_id: id,
            servicio_id: s.servicio_id,
            cantidad: Math.max(1, Number(s.cantidad) || 1),
          }));

        if (pivotRows.length > 0) {
          await PaqueteServicio.bulkCreate(pivotRows, { transaction: t });
        }
      }
    });

    return await this.getById(id);
  }

  /**
   * Alterna o establece el estado de un paquete (Publicar / Desactivar).
   */
  static async toggleStatus(id, newStatus = null) {
    const paquete = await Paquete.findByPk(id);
    if (!paquete) {
      throw new NotFoundError('Paquete turístico no encontrado.');
    }

    if (newStatus && (newStatus === 'ACTIVO' || newStatus === 'INACTIVO')) {
      paquete.estado = newStatus;
    } else {
      paquete.estado = paquete.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    }

    await paquete.save();
    return await this.getById(id);
  }

  /**
   * Elimina un paquete. Si está vinculado a reservaciones activas, se desactiva por seguridad.
   */
  static async delete(id) {
    const paquete = await Paquete.findByPk(id);
    if (!paquete) {
      throw new NotFoundError('Paquete turístico no encontrado.');
    }

    const reservacionesActivas = await Reservation.count({
      where: {
        paquete_id: id,
        estado: { [Op.in]: ['PENDIENTE', 'CONFIRMADA'] },
      },
    });

    if (reservacionesActivas > 0) {
      paquete.estado = 'INACTIVO';
      await paquete.save();
      return {
        deleted: false,
        deactivated: true,
        message: 'El paquete cuenta con reservaciones activas. Se ha desactivado en lugar de eliminarse.',
        data: paquete,
      };
    }

    await sequelize.transaction(async (t) => {
      await PaqueteServicio.destroy({
        where: { paquete_id: id },
        transaction: t,
      });
      await paquete.destroy({ transaction: t });
    });

    return {
      deleted: true,
      deactivated: false,
      message: 'Paquete eliminado correctamente.',
    };
  }
}

export default PaqueteService;
