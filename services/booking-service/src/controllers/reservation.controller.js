import ReservationService from '../services/reservation.service.js';
import { BadRequestError, ForbiddenError, InternalServerError } from '../utils/errors.util.js';

function logControllerError(context, error, req) {
  const now = new Date().toISOString();
  console.error(
    `[${now}] [CONTROLLER ERROR][${context}] method=${req?.method} url=${req?.originalUrl} user=${
      req?.user?.id ?? '(anon)'
    } rol=${req?.user?.rol ?? '—'}`
  );
  console.error(`  message: ${error?.message ?? '(no message)'}`);
  if (error?.name) console.error(`  errorName: ${error.name}`);
  if (error?.stack) {
    console.error(
      `  stack: ${error.stack.split('\n')[0]}${
        error.stack.split('\n')[1] ? '\n' + error.stack.split('\n')[1] : ''
      }`
    );
  }
}

// Controlador peticiones HTTP Reservaciones y Observadores
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
        return next(
          new InternalServerError(
            'Error al cargar reservaciones: asociaciones de base de datos inválidas'
          )
        );
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
      const esStaff = req.user.rol === 'ADMIN' || req.user.rol === 'RECEPCION';
      const reservaUsuarioId =
        reserva.usuario_id ?? (reserva.usuario && reserva.usuario.id);
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
        return next(
          new InternalServerError('Error al cargar el detalle de la reservación')
        );
      }
      next(error);
    }
  }

  // Crea una nueva reservación (Chain of Responsibility -> Composite -> Builder -> Observer)
  static async create(req, res, next) {
    try {
      const {
        cliente_id,
        cliente_datos,
        acompanantes,
        habitacion_id,
        fecha_inicio,
        fecha_fin,
        estado,
        precio_total,
        paquete_id,
        servicios_adicionales,
        notas,
        metodo_pago,
        tipo_reserva,
        anticipo,
        es_prorroga,
        observaciones_recepcion,
      } = req.body;
      const usuario_id = req.body.usuario_id || req.user?.id || null;

      const nuevaReserva = await ReservationService.createReservation({
        cliente_id,
        cliente_datos,
        acompanantes,
        usuario_id,
        habitacion_id,
        fecha_inicio,
        fecha_fin,
        estado,
        precio_total,
        paquete_id,
        servicios_adicionales,
        notas,
        metodo_pago,
        tipo_reserva,
        anticipo,
        es_prorroga,
        observaciones_recepcion,
      });

      res.status(201).json({
        success: true,
        message: 'Reserva creada correctamente',
        data: nuevaReserva,
        validationTrace: nuevaReserva?.validationTrace || [],
        notificationTrace: nuevaReserva?.notificationTrace || [],
      });
    } catch (error) {
      logControllerError('Reservation.create', error, req);
      if (error && error.name === 'RoomServiceUnavailableError') {
        const wrapped = new InternalServerError(error.message);
        wrapped.validationTrace = error.validationTrace;
        return next(wrapped);
      }
      if (error && error.name === 'RoomNotFoundError') {
        const wrapped = new BadRequestError(error.message);
        wrapped.validationTrace = error.validationTrace;
        return next(wrapped);
      }
      next(error);
    }
  }

  // Actualiza datos de una reservación existente
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      await ReservationService.getReservationById(id);

      const actualizada = await ReservationService.updateReservation(
        id,
        req.user,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Reserva actualizada correctamente',
        data: actualizada,
        validationTrace: actualizada?.validationTrace || [],
        notificationTrace: actualizada?.notificationTrace || [],
      });
    } catch (error) {
      logControllerError('Reservation.update', error, req);
      next(error);
    }
  }

  // Cancela una reservación existente y dispara Observer ('RESERVA_CANCELADA')
  static async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.user;
      const cancelada = await ReservationService.cancelReservation(id, usuario);
      res.status(200).json({
        success: true,
        message: 'Reserva cancelada correctamente',
        data: cancelada,
        validationTrace: cancelada?.validationTrace || [],
        notificationTrace: cancelada?.notificationTrace || [],
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
      await ReservationService.getReservationById(id);
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

  // Realiza el check-in asistido y dispara Observer ('CHECK_IN_REALIZADO')
  static async checkIn(req, res, next) {
    try {
      const { id } = req.params;
      const actualizada = await ReservationService.checkIn(
        id,
        req.user,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Check-in realizado correctamente',
        data: actualizada,
        validationTrace: actualizada?.validationTrace || [],
        notificationTrace: actualizada?.notificationTrace || [],
      });
    } catch (error) {
      logControllerError('Reservation.checkIn', error, req);
      next(error);
    }
  }

  // Realiza el check-out de la habitación y dispara Observer ('CHECK_OUT_REALIZADO')
  static async checkOut(req, res, next) {
    try {
      const { id } = req.params;
      const actualizada = await ReservationService.checkOut(
        id,
        req.user,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Check-out realizado correctamente',
        data: actualizada,
        validationTrace: actualizada?.validationTrace || [],
        notificationTrace: actualizada?.notificationTrace || [],
      });
    } catch (error) {
      logControllerError('Reservation.checkOut', error, req);
      next(error);
    }
  }

  // Registra prórroga de estadía y nota de retraso
  static async prorroga(req, res, next) {
    try {
      const { id } = req.params;
      const actualizada = await ReservationService.prorroga(
        id,
        req.user,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Prórroga de reserva registrada correctamente',
        data: actualizada,
      });
    } catch (error) {
      logControllerError('Reservation.prorroga', error, req);
      next(error);
    }
  }

  // Registra No-Show sin preaviso y dispara Observer ('RESERVA_CANCELADA')
  static async noShow(req, res, next) {
    try {
      const { id } = req.params;
      const actualizada = await ReservationService.noShow(
        id,
        req.user,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Reserva marcada como No-Show sin preaviso',
        data: actualizada,
        validationTrace: actualizada?.validationTrace || [],
        notificationTrace: actualizada?.notificationTrace || [],
      });
    } catch (error) {
      logControllerError('Reservation.noShow', error, req);
      next(error);
    }
  }

  // GET /observers -> Consulta qué observadores están activos en ReservationEventManager
  static async getObservers(req, res, next) {
    try {
      const status = ReservationService.getObserversStatus();
      res.status(200).json({
        success: true,
        message: 'Estado de los observadores obtenido correctamente',
        data: status,
        activeObservers: status.activeObservers,
        observers: status.observers,
        auditHistory: status.auditHistory,
      });
    } catch (error) {
      logControllerError('Reservation.getObservers', error, req);
      next(error);
    }
  }

  // POST /observers/toggle -> Suscribe o desuscribe un observador en caliente
  static async toggleObserver(req, res, next) {
    try {
      const observerName =
        req.body?.observerName || req.body?.name || req.body?.observer;
      const explicitActive =
        typeof req.body?.active === 'boolean'
          ? req.body.active
          : typeof req.body?.enabled === 'boolean'
          ? req.body.enabled
          : undefined;

      const result = ReservationService.toggleObserver(
        observerName,
        explicitActive
      );

      res.status(200).json({
        success: true,
        message: `Observador '${result.observer}' ${
          result.active ? 'suscrito (activo)' : 'desuscrito (inactivo)'
        } correctamente`,
        data: result,
        activeObservers: result.activeObservers,
        observers: result.allObservers,
      });
    } catch (error) {
      logControllerError('Reservation.toggleObserver', error, req);
      next(error);
    }
  }

  // GET /occupied-rooms -> Retorna IDs de habitaciones con reservas activas (PENDIENTE, CONFIRMADA, EN_CURSO)
  static async getOccupiedRooms(req, res, next) {
    try {
      const occupied = await ReservationService.getOccupiedRooms(req.query);
      res.status(200).json({
        success: true,
        message: 'Habitaciones ocupadas obtenidas correctamente',
        data: occupied,
      });
    } catch (error) {
      logControllerError('Reservation.getOccupiedRooms', error, req);
      next(error);
    }
  }

  // GET /available-rooms -> Retorna catálogo de habitaciones realmente disponibles
  static async getAvailableRooms(req, res, next) {
    try {
      const rooms = await ReservationService.getAvailableRooms(req.query);
      res.status(200).json({
        success: true,
        message: 'Habitaciones disponibles obtenidas correctamente',
        data: rooms,
      });
    } catch (error) {
      logControllerError('Reservation.getAvailableRooms', error, req);
      next(error);
    }
  }
}

export default ReservationController;
