import { Op } from 'sequelize';
import RoomRepository from '../repositories/room.repository.js';
import Tag from '../models/Tag.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  assertRequired,
} from '../utils/errors.util.js';

// Servicio lógica negocio Habitaciones
class RoomService {
  // Crea nueva habitación y asigna etiquetas
  static async create(data) {
    const { numero, tipo, precio_noche, tag_ids } = data;

    assertRequired(numero, 'El número de habitación es requerido');
    assertRequired(tipo, 'El tipo de habitación es requerido');
    assertRequired(precio_noche, 'El precio por noche es requerido');

    const exists = await RoomRepository.getByNumero(numero);
    if (exists) {
      throw new ConflictError('Ya existe una habitación con este número');
    }

    const payload = {
      numero: String(numero).trim(),
      tipo,
      precio_noche,
      descripcion:
        typeof data.descripcion === 'string' && data.descripcion.trim().length > 0
          ? data.descripcion.trim()
          : '',
    };

    const tagIdsToSet = Array.isArray(tag_ids) ? tag_ids.filter((x) => typeof x === 'string' && x.length > 0) : null;
    if (tagIdsToSet && tagIdsToSet.length > 0) {
      const count = await Tag.count({ where: { id: { [Op.in]: tagIdsToSet } } });
      if (count !== tagIdsToSet.length) {
        throw new BadRequestError('Una o más etiquetas proporcionadas no existen');
      }
    }

    const created = await RoomRepository.create(payload);
    if (tagIdsToSet && tagIdsToSet.length > 0) {
      try {
        await created.setEtiquetas(tagIdsToSet);
      } catch (err) {
        // rollback parcial: desasigna si falló, no mata el proceso entero (conservamos habitación)
        try {
          await created.setEtiquetas([]);
        } catch {
          // ignore
        }
      }
    }
    return await RoomRepository.getById(created.id);
  }

  // Obtiene lista habitaciones con filtros opcionales
  static async getAll(filters = {}) {
    return await RoomRepository.getAll({ where: filters });
  }

  // Obtiene habitación por ID o lanza 404
  static async getById(id) {
    assertRequired(id, 'El id de la habitación es requerido');
    const room = await RoomRepository.getById(id);
    if (!room) {
      throw new NotFoundError('Habitación no encontrada');
    }
    return room;
  }

  // Obtiene habitaciones disponibles en rango fechas
  static async getAvailable(fecha_inicio, fecha_fin) {
    assertRequired(fecha_inicio, 'La fecha de inicio es requerida');
    assertRequired(fecha_fin, 'La fecha de fin es requerida');

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    if (inicio >= fin) {
      throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    return await RoomRepository.getAvailableRooms(inicio, fin);
  }

  // Actualiza habitación y sus etiquetas asociadas
  static async update(id, data) {
    const existing = await this.getById(id);
    if (data.numero) {
      const dup = await RoomRepository.getByNumero(data.numero);
      if (dup && dup.id !== id) {
        throw new ConflictError('Ya existe una habitación con este número');
      }
    }

    const updatePayload = {};
    if (data.numero !== undefined) updatePayload.numero = String(data.numero).trim();
    if (data.tipo !== undefined) updatePayload.tipo = data.tipo;
    if (data.precio_noche !== undefined && data.precio_noche !== null) updatePayload.precio_noche = data.precio_noche;
    if (data.estado !== undefined) updatePayload.estado = data.estado;
    if (typeof data.descripcion === 'string') {
      updatePayload.descripcion = data.descripcion.trim();
    }

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
      try {
        await existing.setEtiquetas(tagIdsToSet);
      } catch (err) {
        // ignore
      }
    }
    return await RoomRepository.getById(id);
  }

  // Elimina habitación por su ID
  static async delete(id) {
    await this.getById(id);
    return await RoomRepository.delete(id);
  }
}

export default RoomService;
