import UserRepository from '../repositories/user.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  assertRequired,
} from '../utils/errors.util.js';

// Servicio lógica negocio Usuarios
class UserService {
  // Crea nuevo usuario validando email único
  static async create(data) {
    const { email, password, nombre } = data;

    assertRequired(email, 'El email es requerido');
    assertRequired(password, 'La contraseña es requerida');
    assertRequired(nombre, 'El nombre es requerido');

    const exists = await UserRepository.getByEmail(email);
    if (exists) {
      throw new ConflictError('Ya existe un usuario con este email');
    }
    return await UserRepository.create(data);
  }

  // Obtiene lista todos los usuarios
  static async getAll() {
    return await UserRepository.getAll();
  }

  // Obtiene lista paginada de usuarios con contadores de resumen (batch)
  static async getAllPaginated({ keyword, page, limit, rol }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 8;

    const result = await UserRepository.findAndCountAllPaginated({
      keyword,
      page: pageNum,
      limit: limitNum,
      rol,
    });

    const { rows, count } = result;
    const perPage = limitNum;
    const totalPages = Math.ceil(count / perPage);
    const ids = rows.map((r) => r.id);

    let summaryMap = new Map();
    if (ids.length > 0) {
      summaryMap = await UserRepository.getSummaryMapForUserIds(ids);
    }

    const items = rows.map((user) => {
      const plain = user.get({ plain: true });
      const counters = summaryMap.get(user.id) || {
        reservaciones_count: 0,
        ingreso_total: null,
        ultima_reserva_fecha: null,
        ultima_reserva_estado: null,
      };
      return { ...plain, ...counters };
    });

    return {
      items,
      meta: {
        total: count,
        page: pageNum,
        perPage,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  // Obtiene usuario por ID o lanza error 404
  static async getById(id) {
    assertRequired(id, 'El id del usuario es requerido');
    const user = await UserRepository.getById(id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }
    return user;
  }

  // Obtiene usuario + resumen (reservaciones_count, ingreso, ultima reserva)
  static async getByIdWithSummary(id) {
    const user = await this.getById(id);
    const plain = user.get({ plain: true });
    const summary = await UserRepository.getSummaryForUserId(id);
    return { ...plain, ...summary };
  }

  // Obtiene usuario por email o lanza error 404
  static async getByEmail(email) {
    assertRequired(email, 'El email es requerido');
    const user = await UserRepository.getByEmail(email);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }
    return user;
  }

  // Actualiza usuario existente validando email único
  static async update(id, data) {
    await this.getById(id);
    if (data.email) {
      const exists = await UserRepository.emailExists(data.email, id);
      if (exists) {
        throw new ConflictError('Ya existe un usuario con este email');
      }
    }
    return await UserRepository.update(id, data);
  }

  // Elimina usuario por su ID
  static async delete(id) {
    await this.getById(id);
    return await UserRepository.delete(id);
  }

  // Valida credenciales login y devuelve usuario
  static async loginWithPassword(email, password) {
    assertRequired(email, 'El email es requerido', BadRequestError);
    assertRequired(password, 'La contraseña es requerida', BadRequestError);

    const user = await this.getByEmail(email);
    const isMatch = await user.comparePassword(String(password));
    if (!isMatch) {
      throw new BadRequestError('Credenciales inválidas');
    }
    return user;
  }
}

export default UserService;
