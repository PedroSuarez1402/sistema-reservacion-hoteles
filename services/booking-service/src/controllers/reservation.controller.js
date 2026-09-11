import ReservationService from '../services/reservation.service.js';
import { BadRequestError, ForbiddenError, InternalServerError } from '../utils/errors.util.js';

function logControllerError(context, error, req) {
  const now = new Date().toISOString();
  console.error(`[${now}] [CONTROLLER ERROR][${context}] method=${req?.method} url=${req?.originalUrl} user=${req?.user?.id ?? '(anon)'} rol=${req?.user?.rol ?? '—'}`);
  console.error(`  message: ${error?.message ?? '(no message)'}`);
  if (error?.name) console.error(`  errorName: ${error.name}`);
  if (error?.stack) console.error(`  stack: ${error.stack.split('\n')[0]}${error.stack.split('\n')[1] ? '\n' + error.stack.split('\n')[1] : ''}`);
}

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
      logControllerError('Reservation.getAll', error, req);
      if (error?.name && error.name.includes('EagerLoadingError')) {
        return next(new InternalServerError('Error al cargar reservaciones: asociaciones de base de datos inválidas'));
      }
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
      logControllerError('Reservation.getMyReservations', error, req);
      if (error?.name && error.name.includes('EagerLoadingError')) {
        return next(new InternalServerError('Error al cargar tus reservaciones'));
      }
      next(error);
    }
  }

  // Obtiene una reservación por su ID con validación permisos
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const reserva = await ReservationService.getReservationById(id);
      if (!reserva) {
        return next(new InternalServerError('Reserva no encontrada'));
      }
      const esStaff =
        req.user.rol === 'ADMIN' || req.user.rol === 'RECEPCION';
      const reservaUsuarioId = reserva.usuario_id ?? (reserva.usuario && reserva.usuario.id);
      if (!esStaff && reservaUsuarioId !== req.user.id) {
        throw new ForbiddenError('No tienes permiso para ver esta reserva');
      }

      res.status(200).json({
        success: true,
        message: 'Reserva obtenida correctamente',
        data: reserva,
      });
    } catch (error) {
      logControllerError('Reservation.getById', error, req);
      if (error?.name && error.name.includes('EagerLoadingError')) {
        return next(new InternalServerError('Error al cargar el detalle de la reservación'));
      }
      next(error);
    }
  }

  // Crea una nueva reservación
  static async create(req, res, next) {
    try {
      const { habitacion_id, fecha_inicio, fecha_fin, estado, precio_total } = req.body;
      const usuario_id = req.user.id;

      const nuevaReserva = await ReservationService.createReservation({
        usuario_id,
        habitacion_id,
        fecha_inicio,
        fecha_fin,
        estado,
        precio_total,
      });

      res.status(201).json({
        success: true,
        message: 'Reserva creada correctamente',
        data: nuevaReserva,
      });
    } catch (error) {
      logControllerError('Reservation.create', error, req);
      if (error && error.name === 'RoomServiceUnavailableError') {
        return next(new InternalServerError(error.message));
      }
      if (error && error.name === 'RoomNotFoundError') {
        return next(new BadRequestError(error.message));
      }
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
      logControllerError('Reservation.update', error, req);
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
      logControllerError('Reservation.cancel', error, req);
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
      logControllerError('Reservation.remove', error, req);
      next(error);
    }
  }
}

export default ReservationController;
