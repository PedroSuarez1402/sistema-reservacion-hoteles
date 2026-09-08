import RoomImageService from '../services/roomImage.service.js';
import { resolvePublicUrl } from '../services/storage.service.js';

// Serializa imagen y genera URLs públicas
function serialize(img) {
  if (!img) return null;
  const plain = typeof img.toJSON === 'function' ? img.toJSON() : { ...img };
  return {
    ...plain,
    url_original: resolvePublicUrl(plain.ruta_original),
    url_web: resolvePublicUrl(plain.ruta_web),
    url_miniatura: resolvePublicUrl(plain.ruta_miniatura),
  };
}

// Objeto exportado controlador Imágenes Habitación
export default {
  // Sube múltiples imágenes para una habitación
  async uploadImages(req, res, next) {
    try {
      const { habitacionId } = req.params;
      const files = req.files || [];
      const result = await RoomImageService.uploadImages(habitacionId, files);
      res.status(201).json({
        status: 'success',
        message: `${result.length} imagen(es) subida(s) correctamente`,
        data: result.map(serialize),
      });
    } catch (err) {
      next(err);
    }
  },

  // Reordena imágenes de una habitación según IDs
  async reorder(req, res, next) {
    try {
      const { habitacionId } = req.params;
      const { ids } = req.body || {};
      const result = await RoomImageService.reorder(habitacionId, ids);
      res.json({
        status: 'success',
        message: 'Orden actualizado correctamente',
        data: result.map(serialize),
      });
    } catch (err) {
      next(err);
    }
  },

  // Establece imagen principal de una habitación
  async setMain(req, res, next) {
    try {
      const { habitacionId, id } = req.params;
      const result = await RoomImageService.setMain(habitacionId, id);
      res.json({
        status: 'success',
        message: 'Imagen principal actualizada',
        data: result.map(serialize),
      });
    } catch (err) {
      next(err);
    }
  },

  // Elimina una imagen de habitación por su ID
  async remove(req, res, next) {
    try {
      const { habitacionId, id } = req.params;
      await RoomImageService.remove(habitacionId, id);
      res.json({
        status: 'success',
        message: 'Imagen eliminada correctamente',
      });
    } catch (err) {
      next(err);
    }
  },

  serialize,
};
