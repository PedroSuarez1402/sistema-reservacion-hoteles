import RoomService from '../services/room.service.js';
import { BadRequestError } from '../utils/errors.util.js';
import RoomImageController from './roomImage.controller.js';

function serializeRoom(room) {
  if (!room) return null;
  const plain = typeof room.toJSON === 'function' ? room.toJSON() : { ...room };
  if (Array.isArray(plain.imagenes)) {
    plain.imagenes = plain.imagenes.map(RoomImageController.serialize);
  }
  return plain;
}

class RoomController {
  static async getAll(req, res, next) {
    try {
      const rooms = await RoomService.getAll();
      res.status(200).json({
        success: true,
        message: 'Habitaciones obtenidas correctamente',
        data: rooms.map(serializeRoom),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailable(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      if (!fecha_inicio || !fecha_fin) {
        throw new BadRequestError('Los parámetros fecha_inicio y fecha_fin son requeridos');
      }
      const rooms = await RoomService.getAvailable(fecha_inicio, fecha_fin);
      res.status(200).json({
        success: true,
        message: 'Habitaciones disponibles obtenidas correctamente',
        data: rooms.map(serializeRoom),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const room = await RoomService.getById(id);
      res.status(200).json({
        success: true,
        message: 'Habitación obtenida correctamente',
        data: serializeRoom(room),
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const room = await RoomService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Habitación creada correctamente',
        data: serializeRoom(room),
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const room = await RoomService.update(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Habitación actualizada correctamente',
        data: serializeRoom(room),
      });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const { id } = req.params;
      await RoomService.delete(id);
      res.status(200).json({
        success: true,
        message: 'Habitación eliminada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default RoomController;
