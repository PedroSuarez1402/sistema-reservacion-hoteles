import ReservationService from '../services/reservation.service.js';
import { ForbiddenError } from '../utils/errors.util.js';

// Controlador peticiones HTTP Reservaciones
class ReservationController {
  // Obtiene lista todas las reservaciones
  static async getAll(req, res, next) {
    try {
      const reservas = await ReservationService.getAllReservations();
      res.status(200).json({
        success: true,
        message: 'Reservas obtenidas correctamente',
        data: reservas,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtiene reservaciones del usuario autenticado
  static async getMyReservations(req, res, next) {
    try {
      const usuario_id = req.user.id;
      const reservas = await ReservationService.getReservationsByUser(usuario_id);
      res.status(200).json({
        success: true,
        message: 'Tus reservas obtenidas correctamente',
        data: reservas,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtiene una reservación por su ID con validación permisos
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const reserva = await ReservationService.getReservationById(id);

      const esStaff =
        req.user.rol === 'ADMIN' || req.user.rol === 'RECEPCION';
      if (!esStaff && reserva.usuario_id !== req.user.id) {
        throw new ForbiddenError('No tienes permiso para ver esta reserva');
      }

      res.status(200).json({
        success: true,
        message: 'Reserva obtenida correctamente',
        data: reserva,
      });
    } catch (error) {
      next(error);
    }
  }

  // Crea una nueva reservación
  static async create(req, res, next) {
    try {
      const { habitacion_id, fecha_inicio, fecha_fin, estado } = req.body;
      const usuario_id = req.user.id;

      const nuevaReserva = await ReservationService.createReservation({
        usuario_id,
        habitacion_id,
        fecha_inicio,
        fecha_fin,
        estado,
      });

      res.status(201).json({
        success: true,
        message: 'Reserva creada correctamente',
        data: nuevaReserva,
      });
    } catch (error) {
      next(error);
    }
  }

  // Actualiza datos de una reservación existente
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const reserva = await ReservationService.getReservationById(id);

      const actualizada = await ReservationService.updateReservation(
        id,
        req.user,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Reserva actualizada correctamente',
        data: actualizada,
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancela una reservación existente
  static async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.user;
      await ReservationService.cancelReservation(id, usuario);
      res.status(200).json({
        success: true,
        message: 'Reserva cancelada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Elimina una reservación por su ID
  static async remove(req, res, next) {
    try {
      const { id } = req.params;
      const reserva = await ReservationService.getReservationById(id);
      await ReservationService.deleteReservation(id, req.user, true);
      res.status(200).json({
        success: true,
        message: 'Reserva eliminada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ReservationController;
