import RoomRepository from '../repositories/room.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  assertRequired,
} from '../utils/errors.util.js';

class RoomService {
  static async create(data) {
    const { numero, tipo, precio_noche } = data;

    assertRequired(numero, 'El número de habitación es requerido');
    assertRequired(tipo, 'El tipo de habitación es requerido');
    assertRequired(precio_noche, 'El precio por noche es requerido');

    const exists = await RoomRepository.getByNumero(numero);
    if (exists) {
      throw new ConflictError('Ya existe una habitación con este número');
    }
    return await RoomRepository.create(data);
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
    assertRequired(fecha_fin, 'La fecha de fin es requerida');

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    if (inicio >= fin) {
      throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    return await RoomRepository.getAvailableRooms(inicio, fin);
  }

  static async update(id, data) {
    await this.getById(id);
    if (data.numero) {
      const existing = await RoomRepository.getByNumero(data.numero);
      if (existing && existing.id !== id) {
        throw new ConflictError('Ya existe una habitación con este número');
      }
    }
    return await RoomRepository.update(id, data);
  }

  static async delete(id) {
    await this.getById(id);
    return await RoomRepository.delete(id);
  }
}

export default RoomService;
