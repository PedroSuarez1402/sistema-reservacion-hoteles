import { BadRequestError, NotFoundError, InternalServerError, assertRequired } from '../utils/errors.util.js';
import RoomRepository from '../repositories/room.repository.js';
import RoomImageRepository from '../repositories/roomImage.repository.js';
import { batchProcessRoomImages } from '../middlewares/upload.middleware.js';
import { deleteRoomImageFiles, deleteRoomFolder } from '../services/storage.service.js';
import sequelize from '../config/database.js';

const MAX_IMAGES_PER_ROOM = 20;

class RoomImageService {
  static async uploadImages(habitacionId, files) {
    assertRequired(habitacionId, 'El id de la habitación es requerido');
    const room = await RoomRepository.getById(habitacionId);
    if (!room) throw new NotFoundError('Habitación no encontrada');
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestError('No se enviaron archivos');
    }
    const existingCount = await RoomImageRepository.countByRoomId(habitacionId);
    if (existingCount + files.length > MAX_IMAGES_PER_ROOM) {
      throw new BadRequestError(
        `No puedes tener más de ${MAX_IMAGES_PER_ROOM} imágenes por habitación (actualmente ${existingCount}).`
      );
    }
    const firstUploadedIsMain = existingCount === 0;
    const startOrden = (await RoomImageRepository.maxOrdenByRoomId(habitacionId)) + 1;
    const attrs = await batchProcessRoomImages(habitacionId, files, startOrden, firstUploadedIsMain);
    const persistibles = attrs.map(({ _paths, ...rest }) => rest);
    const created = await RoomImageRepository.bulkCreate(persistibles);
    return created;
  }

  static async reorder(habitacionId, idsInOrder) {
    assertRequired(habitacionId, 'El id de la habitación es requerido');
    if (!Array.isArray(idsInOrder)) {
      throw new BadRequestError('El orden debe ser un array de IDs');
    }
    const room = await RoomRepository.getById(habitacionId);
    if (!room) throw new NotFoundError('Habitación no encontrada');
    const existing = await RoomImageRepository.getByRoomId(habitacionId);
    const existingIds = new Set(existing.map((i) => i.id));
    for (const id of idsInOrder) {
      if (!existingIds.has(id)) {
        throw new BadRequestError(`La imagen "${id}" no pertenece a esta habitación`);
      }
    }
    const missing = existing.filter((i) => !idsInOrder.includes(i.id)).map((i) => i.id);
    const finalOrder = [...idsInOrder, ...missing];
    return await RoomImageRepository.reorder(habitacionId, finalOrder);
  }

  static async setMain(habitacionId, imageId) {
    assertRequired(habitacionId, 'El id de la habitación es requerido');
    assertRequired(imageId, 'El id de la imagen es requerido');
    const room = await RoomRepository.getById(habitacionId);
    if (!room) throw new NotFoundError('Habitación no encontrada');
    const image = await RoomImageRepository.getById(imageId);
    if (!image) throw new NotFoundError('Imagen no encontrada');
    if (String(image.habitacion_id) !== String(habitacionId)) {
      throw new BadRequestError('La imagen no pertenece a esta habitación');
    }
    const t = await sequelize.transaction();
    try {
      await RoomImageRepository.clearMainForRoom(habitacionId, t);
      await RoomImageRepository.setMain(imageId, t);
      await t.commit();
      return await RoomImageRepository.getByRoomId(habitacionId);
    } catch (err) {
      await t.rollback();
      if (err instanceof BadRequestError || err instanceof NotFoundError) throw err;
      throw new InternalServerError('Error al marcar imagen principal');
    }
  }

  static async remove(habitacionId, imageId) {
    assertRequired(habitacionId, 'El id de la habitación es requerido');
    assertRequired(imageId, 'El id de la imagen es requerido');
    const room = await RoomRepository.getById(habitacionId);
    if (!room) throw new NotFoundError('Habitación no encontrada');
    const image = await RoomImageRepository.getById(imageId);
    if (!image) throw new NotFoundError('Imagen no encontrada');
    if (String(image.habitacion_id) !== String(habitacionId)) {
      throw new BadRequestError('La imagen no pertenece a esta habitación');
    }
    const wasMain = image.es_principal;
    const pathsObj = {
      originalAbs: image.ruta_original,
      webAbs: image.ruta_web,
      thumbAbs: image.ruta_miniatura,
    };
    const { PROJECT_ROOT } = await import('../services/storage.service.js');
    const resolved = {
      originalAbs: pathsObj.originalAbs ? `${PROJECT_ROOT}/${pathsObj.originalAbs}` : null,
      webAbs: pathsObj.webAbs ? `${PROJECT_ROOT}/${pathsObj.webAbs}` : null,
      thumbAbs: pathsObj.thumbAbs ? `${PROJECT_ROOT}/${pathsObj.thumbAbs}` : null,
    };
    deleteRoomImageFiles(resolved);
    await RoomImageRepository.remove(imageId);
    if (wasMain) {
      const rest = await RoomImageRepository.getByRoomId(habitacionId);
      if (rest.length > 0) {
        await this.setMain(habitacionId, rest[0].id);
      }
    }
    return true;
  }

  static async deleteRoomFolderCascade(roomId) {
    deleteRoomFolder(roomId);
  }
}

export default RoomImageService;
