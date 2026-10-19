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

  // ===========================================================================
  // En esta sección se cumple lo que hace el patrón de Flyweight SIN aplicar el patrón:
  // Por cada habitación consultada, se crean desde cero en memoria RAM nuevos
  // objetos para las especificaciones de su categoría (SENCILLA, DOBLE, SUITE)
  // y nuevas instancias para cada una de sus etiquetas (tags), duplicando la
  // información común en cada objeto de habitación en lugar de compartirla.
  // ===========================================================================
  static armarHabitacionSinFlyweight(room) {
    const plain = typeof room?.toJSON === 'function' ? room.toJSON() : { ...room };

    // Se instancia un objeto nuevo en RAM por cada habitación (sin compartir estado intrínseco)
    let especificaciones_tipo;
    if (plain.tipo === 'SUITE') {
      especificaciones_tipo = {
        tipo: 'SUITE',
        capacidad_maxima: 4,
        tipo_cama: '1 Cama King Size + Sofá Cama',
        dimensiones_m2: 55,
        politica_check_in_out: 'Check-in 14:00 / Late Check-out 13:00',
      };
    } else if (plain.tipo === 'DOBLE') {
      especificaciones_tipo = {
        tipo: 'DOBLE',
        capacidad_maxima: 2,
        tipo_cama: '2 Camas Sencillas o 1 Cama Queen',
        dimensiones_m2: 32,
        politica_check_in_out: 'Check-in 15:00 / Check-out 12:00',
      };
    } else {
      especificaciones_tipo = {
        tipo: 'SENCILLA',
        capacidad_maxima: 1,
        tipo_cama: '1 Cama Sencilla (Twin)',
        dimensiones_m2: 20,
        politica_check_in_out: 'Check-in 15:00 / Check-out 12:00',
      };
    }

    // Se clona cada etiqueta en un nuevo objeto en memoria por cada habitación
    const etiquetasDuplicadas = Array.isArray(plain.etiquetas)
      ? plain.etiquetas.map((tag) => ({
          id: tag.id,
          nombre: tag.nombre,
          descripcion: tag.descripcion ?? null,
        }))
      : [];

    return {
      ...plain,
      especificaciones_tipo,
      etiquetas: etiquetasDuplicadas,
    };
  }

  // Obtiene lista habitaciones con filtros opcionales (sin patrón Flyweight)
  static async getAll(filters = {}) {
    const rooms = await RoomRepository.getAll({ where: filters });
    return rooms.map((room) => this.armarHabitacionSinFlyweight(room));
  }

  // Obtiene habitación por ID o lanza 404
  static async getById(id) {
    assertRequired(id, 'El id de la habitación es requerido');
    const room = await RoomRepository.getById(id);
    if (!room) {
      throw new NotFoundError('Habitación no encontrada');
    }
    return this.armarHabitacionSinFlyweight(room);
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
    const availableRooms = await RoomRepository.getAvailableRooms(inicio, fin);
    return availableRooms.map((room) => this.armarHabitacionSinFlyweight(room));
  }

  // Actualiza habitación y sus etiquetas asociadas
  static async update(id, data) {
    assertRequired(id, 'El id de la habitación es requerido');
    const existing = await RoomRepository.getById(id);
    if (!existing) {
      throw new NotFoundError('Habitación no encontrada');
    }
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
