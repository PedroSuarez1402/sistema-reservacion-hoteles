import RoomRepository from '../repositories/room.repository.js';

class RoomService {
  static async create(data) {
    const { numero } = data;
    if (!numero) {
      throw new Error('El número de habitación es requerido');
    }
    const exists = await RoomRepository.getByNumero(numero);
    if (exists) {
      throw new Error('Ya existe una habitación con este número');
    }
    return await RoomRepository.create(data);
  }

  static async getAll(filters = {}) {
    return await RoomRepository.getAll({ where: filters });
  }

  static async getById(id) {
    const room = await RoomRepository.getById(id);
    if (!room) {
      throw new Error('Habitación no encontrada');
    }
    return room;
  }

  static async getAvailable(fecha_inicio, fecha_fin) {
    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    if (inicio >= fin) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    return await RoomRepository.getAvailableRooms(inicio, fin);
  }

  static async update(id, data) {
    await this.getById(id);
    if (data.numero) {
      const existing = await RoomRepository.getByNumero(data.numero);
      if (existing && existing.id !== id) {
        throw new Error('Ya existe una habitación con este número');
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
