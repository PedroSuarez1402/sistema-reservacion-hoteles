import { Op } from 'sequelize';
import User from '../models/User.js';

// Repositorio acceso datos Usuarios
class UserRepository {
  // Crea nuevo registro usuario en BD
  static async create(data) {
    return await User.create(data);
  }

  // Obtiene lista usuarios con opciones where y order
  static async getAll(options = {}) {
    const { where = {}, order = [['created_at', 'DESC']] } = options;
    return await User.findAll({ where, order });
  }

  // Busca usuario por clave primaria ID
  static async getById(id) {
    return await User.findByPk(id);
  }

  // Alias findById = getById
  static async findById(id) {
    return await this.getById(id);
  }

  // Busca usuario por email normalizado
  static async getByEmail(email) {
    return await User.findOne({
      where: { email: String(email).trim().toLowerCase() },
    });
  }

  // Actualiza datos usuario existente por ID
  static async update(id, data) {
    const user = await this.getById(id);
    if (!user) return null;
    return await user.update(data);
  }

  // Elimina usuario por ID (destroy)
  static async delete(id) {
    const user = await this.getById(id);
    if (!user) return null;
    await user.destroy();
    return user;
  }

  // Verifica si existe usuario por ID
  static async exists(id) {
    const count = await User.count({ where: { id } });
    return count > 0;
  }

  // Verifica email único, excluyendo ID opcional
  static async emailExists(email, excludeId = null) {
    const where = { email: String(email).trim().toLowerCase() };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const count = await User.count({ where });
    return count > 0;
  }
}

export default UserRepository;
