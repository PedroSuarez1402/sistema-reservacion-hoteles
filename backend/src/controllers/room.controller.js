import RoomService from '../services/room.service.js';

class RoomController {
  static async getAll(req, res, next) {
    try {
      const rooms = await RoomService.getAll();
      res.status(200).json({
        success: true,
        message: 'Habitaciones obtenidas correctamente',
        data: rooms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailable(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: 'Los parámetros fecha_inicio y fecha_fin son requeridos',
        });
      }
      const rooms = await RoomService.getAvailable(fecha_inicio, fecha_fin);
      res.status(200).json({
        success: true,
        message: 'Habitaciones disponibles obtenidas correctamente',
        data: rooms,
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
        data: room,
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
        data: room,
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
        data: room,
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
