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

  // Obtiene usuario por ID o lanza error 404
  static async getById(id) {
    assertRequired(id, 'El id del usuario es requerido');
    const user = await UserRepository.getById(id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }
    return user;
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
