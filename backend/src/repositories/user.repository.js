import { Op } from 'sequelize';
import User from '../models/User.js';

class UserRepository {
  static async create(data) {
    return await User.create(data);
  }

  static async getAll(options = {}) {
    const { where = {}, order = [['created_at', 'DESC']] } = options;
    return await User.findAll({ where, order });
  }

  static async getById(id) {
    return await User.findByPk(id);
  }

  static async findById(id) {
    return await this.getById(id);
  }

  static async getByEmail(email) {
    return await User.findOne({
      where: { email: String(email).trim().toLowerCase() },
    });
  }

  static async update(id, data) {
    const user = await this.getById(id);
    if (!user) return null;
    return await user.update(data);
  }

  static async delete(id) {
    const user = await this.getById(id);
    if (!user) return null;
    await user.destroy();
    return user;
  }

  static async exists(id) {
    const count = await User.count({ where: { id } });
    return count > 0;
  }

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
