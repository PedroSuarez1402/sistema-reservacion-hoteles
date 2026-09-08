import { Op } from 'sequelize';
import RoomImage from '../models/RoomImage.js';
import sequelize from '../config/database.js';

class RoomImageRepository {
  static async bulkCreate(imagesData) {
    return await RoomImage.bulkCreate(imagesData, { returning: true });
  }

  static async getById(id) {
    return await RoomImage.findByPk(id);
  }

  static async getByRoomId(habitacion_id) {
    return await RoomImage.findAll({
      where: { habitacion_id },
      order: [
        ['orden', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
  }

  static async countByRoomId(habitacion_id) {
    return await RoomImage.count({ where: { habitacion_id } });
  }

  static async maxOrdenByRoomId(habitacion_id) {
    const row = await RoomImage.findOne({
      where: { habitacion_id },
      attributes: [[sequelize.fn('MAX', sequelize.col('orden')), 'max_orden']],
      raw: true,
    });
    const n = Number(row?.max_orden);
    return Number.isFinite(n) ? n : -1;
  }

  static async clearMainForRoom(habitacion_id, transaction) {
    return await RoomImage.update(
      { es_principal: false },
      { where: { habitacion_id }, transaction }
    );
  }

  static async setMain(id, transaction) {
    return await RoomImage.update(
      { es_principal: true },
      { where: { id }, transaction }
    );
  }

  static async reorder(habitacion_id, idsInOrder) {
    if (!Array.isArray(idsInOrder) || idsInOrder.length === 0) return [];
    const t = await sequelize.transaction();
    try {
      for (let i = 0; i < idsInOrder.length; i += 1) {
        await RoomImage.update(
          { orden: i },
          { where: { id: idsInOrder[i], habitacion_id }, transaction: t }
        );
      }
      await t.commit();
      return await this.getByRoomId(habitacion_id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  static async remove(id) {
    const image = await this.getById(id);
    if (!image) return null;
    await image.destroy();
    return image;
  }

  static async findManyByIds(ids, habitacion_id) {
    return await RoomImage.findAll({
      where: { id: { [Op.in]: ids }, habitacion_id },
    });
  }
}

export default RoomImageRepository;
