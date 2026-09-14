// ==========================================
// 2. Productos Concretos (Concrete Products)
// ==========================================

import { Op } from 'sequelize';
import RoomRepository from '../repositories/room.repository.js';
import Tag from '../models/Tag.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  assertRequired,
} from '../utils/errors.util.js';
import { RoomFactory } from '../factories/room.factory.js';


class RoomService {
  /**
   * Crea una nueva habitación delegando la construcción al Factory Method.
   */
  static async create(data) {
    const { numero, tipo, tag_ids } = data;

    // --- 1. Validaciones previas (genéricas, independientes de tipo) ---
    assertRequired(numero, 'El número de habitación es requerido');
    assertRequired(tipo,   'El tipo de habitación es requerido');
    
    // --- 2. Unicidad número habitación (check BD) ---
    const exists = await RoomRepository.getByNumero(numero);
    if (exists) {
      throw new ConflictError('Ya existe una habitación con este número');
    }

    // 1. Integración con Factory Method:
    // RoomService desconoce las clases concretas; delega la instanciación a la fábrica
    let habitacionProducto;
    try {
      habitacionProducto = RoomFactory.fabricar(tipo, data);
    } catch (factoryErr) {

      throw new BadRequestError(factoryErr.message);
    }

    // 2. Extraer el payload compatible con el modelo Sequelize
    const payload = habitacionProducto.toDatabasePayload();
    if (!Number.isFinite(Number(payload.precio_noche)) || Number(payload.precio_noche) <= 0) {
      throw new BadRequestError(
        'El precio por noche debe ser un número mayor a 0. Verifique el campo o ' +
        'déjelo vacío para usar el valor por defecto de este tipo de habitación.'
      );
    }

    // 3. Validación de etiquetas (relación N:M)
    const tagIdsToSet = Array.isArray(tag_ids)
      ? tag_ids.filter((x) => typeof x === 'string' && x.length > 0)
      : null;
    if (tagIdsToSet && tagIdsToSet.length > 0) {
      const count = await Tag.count({ where: { id: { [Op.in]: tagIdsToSet } } });
      if (count !== tagIdsToSet.length) {
        throw new BadRequestError('Una o más etiquetas proporcionadas no existen');
      }
    }

    // 4. Persistir a través del repositorio y asociar etiquetas
    const created = await RoomRepository.create(payload);
    if (tagIdsToSet && tagIdsToSet.length > 0) {
      try {
        await created.setEtiquetas(tagIdsToSet);
      } catch (err) {
        
        try { await created.setEtiquetas([]); } catch (_) { /* ignore */ }
      }
    }
    return await RoomRepository.getById(created.id);
  }

  static async getAll(filters = {}) {
    return await RoomRepository.getAll({ where: filters });
  }

  static async getById(id) {
    assertRequired(id, 'El id de la habitación es requerido');
    const room = await RoomRepository.getById(id);
    if (!room) {
      throw new NotFoundError('Habitación no encontrada');
    }
    return room;
  }

  static async getAvailable(fecha_inicio, fecha_fin) {
    assertRequired(fecha_inicio, 'La fecha de inicio es requerida');
    assertRequired(fecha_fin,    'La fecha de fin es requerida');

    const inicio = new Date(fecha_inicio);
    const fin    = new Date(fecha_fin);
    if (inicio >= fin) {
      throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    return await RoomRepository.getAvailableRooms(inicio, fin);
  }

  /**
   * Actualiza una habitación. Si se modifica el tipo, se recurre a la fábrica para autocompletar defaults.
   */
  static async update(id, data) {
    const existing = await this.getById(id);

    if (data.numero) {
      const dup = await RoomRepository.getByNumero(data.numero);
      if (dup && dup.id !== id) {
        throw new ConflictError('Ya existe una habitación con este número');
      }
    }

    let updatePayload = {};
    if (data.tipo !== undefined || data.precio_noche !== undefined || data.descripcion !== undefined || data.estado !== undefined || data.numero !== undefined) {
      const tipoReconstruir = data.tipo ?? existing.tipo;
      try {
        const habitacionActualizada = RoomFactory.fabricar(tipoReconstruir, {
          numero:      data.numero      ?? existing.numero,
          precio_noche:data.precio_noche,
          descripcion: data.descripcion ?? existing.descripcion,
          estado:      data.estado      ?? existing.estado,
        });
        updatePayload = habitacionActualizada.toDatabasePayload();
      } catch (factoryErr) {
        throw new BadRequestError(factoryErr.message);
      }
    }

    if (data.numero === undefined) delete updatePayload.numero;

    if (!Number.isNaN(Number(updatePayload.precio_noche)) && Number(updatePayload.precio_noche) <= 0) {
      throw new BadRequestError('El precio por noche debe ser mayor a 0.');
    }

    // Validación tag_ids existencia
    const tagIdsToSet = Array.isArray(data.tag_ids)
      ? data.tag_ids.filter((x) => typeof x === 'string' && x.length > 0)
      : null;
    if (tagIdsToSet && tagIdsToSet.length > 0) {
      const count = await Tag.count({ where: { id: { [Op.in]: tagIdsToSet } } });
      if (count !== tagIdsToSet.length) {
        throw new BadRequestError('Una o más etiquetas proporcionadas no existen');
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await RoomRepository.update(id, updatePayload);
    }
    if (tagIdsToSet !== null) {
      try { await existing.setEtiquetas(tagIdsToSet); } catch (_) { /* ignore */ }
    }
    return await RoomRepository.getById(id);
  }

  static async delete(id) {
    await this.getById(id);
    return await RoomRepository.delete(id);
  }
}

export default RoomService;
