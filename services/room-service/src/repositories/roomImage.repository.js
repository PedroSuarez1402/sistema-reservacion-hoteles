import { Op } from 'sequelize';
import RoomImage from '../models/RoomImage.js';
import sequelize from '../config/database.js';

// Repositorio acceso datos Imágenes Habitación
class RoomImageRepository {
  // Crea múltiples registros imagen en lote
  static async bulkCreate(imagesData) {
    return await RoomImage.bulkCreate(imagesData, { returning: true });
  }

  // Busca imagen por clave primaria ID
  static async getById(id) {
    return await RoomImage.findByPk(id);
  }

  // Obtiene todas imágenes de una habitación ordenadas
  static async getByRoomId(habitacion_id) {
    return await RoomImage.findAll({
      where: { habitacion_id },
      order: [
        ['orden', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
  }

  // Cuenta total imágenes por habitación ID
  static async countByRoomId(habitacion_id) {
    return await RoomImage.count({ where: { habitacion_id } });
  }

  // Obtiene valor máximo campo orden por habitación
  static async maxOrdenByRoomId(habitacion_id) {
    const row = await RoomImage.findOne({
      where: { habitacion_id },
      attributes: [[sequelize.fn('MAX', sequelize.col('orden')), 'max_orden']],
      raw: true,
    });
    const n = Number(row?.max_orden);
    return Number.isFinite(n) ? n : -1;
  }

  // Desmarca es_principal = false todas imágenes habitación
  static async clearMainForRoom(habitacion_id, transaction) {
    return await RoomImage.update(
      { es_principal: false },
      { where: { habitacion_id }, transaction }
    );
  }

  // Marca imagen específica como principal
  static async setMain(id, transaction) {
    return await RoomImage.update(
      { es_principal: true },
      { where: { id }, transaction }
    );
  }

  // Reordena imágenes por índice array IDs en transacción
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

  // Elimina imagen por ID (destroy)
  static async remove(id) {
    const image = await this.getById(id);
    if (!image) return null;
    await image.destroy();
    return image;
  }

  // Busca múltiples imágenes por array IDs y habitación
  static async findManyByIds(ids, habitacion_id) {
    return await RoomImage.findAll({
      where: { id: { [Op.in]: ids }, habitacion_id },
    });
  }
}

export default RoomImageRepository;
