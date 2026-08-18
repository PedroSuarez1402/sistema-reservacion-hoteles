import UserRepository from '../repositories/user.repository.js';

class UserService {
  static async create(data) {
    const { email } = data;
    if (!email) {
      throw new Error('El email es requerido');
    }
    const exists = await UserRepository.getByEmail(email);
    if (exists) {
      throw new Error('Ya existe un usuario con este email');
    }
    return await UserRepository.create(data);
  }

  static async getAll() {
    return await UserRepository.getAll();
  }

  static async getById(id) {
    const user = await UserRepository.getById(id);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  }

  static async getByEmail(email) {
    const user = await UserRepository.getByEmail(email);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  }

  static async update(id, data) {
    await this.getById(id);
    if (data.email) {
      const exists = await UserRepository.emailExists(data.email, id);
      if (exists) {
        throw new Error('Ya existe un usuario con este email');
      }
    }
    return await UserRepository.update(id, data);
  }

  static async delete(id) {
    await this.getById(id);
    return await UserRepository.delete(id);
  }
}

export default UserService;
