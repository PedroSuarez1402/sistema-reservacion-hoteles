import ReservationService from '../services/reservation.service.js';

class ReservationController {
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

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const reserva = await ReservationService.getReservationById(id);

      if (
        req.user.rol !== 'ADMIN' &&
        req.user.rol !== 'RECEPCION' &&
        reserva.usuario_id !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver esta reserva',
        });
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

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const usuario_id = req.user.id;
      const reserva = await ReservationService.getReservationById(id);
      const esAdminORecepcion =
        req.user.rol === 'ADMIN' || req.user.rol === 'RECEPCION';
      if (!esAdminORecepcion && reserva.usuario_id !== usuario_id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para modificar esta reserva',
        });
      }

      const actualizada = await ReservationService.updateReservation(
        id,
        esAdminORecepcion ? req.body.usuario_id || reserva.usuario_id : usuario_id,
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

  static async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const reserva = await ReservationService.getReservationById(id);
      const esAdminORecepcion =
        req.user.rol === 'ADMIN' || req.user.rol === 'RECEPCION';
      if (!esAdminORecepcion && reserva.usuario_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para cancelar esta reserva',
        });
      }

      await ReservationService.cancelReservation(id, reserva.usuario_id);

      res.status(200).json({
        success: true,
        message: 'Reserva cancelada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const { id } = req.params;
      const esAdminORecepcion =
        req.user.rol === 'ADMIN' || req.user.rol === 'RECEPCION';
      const reserva = await ReservationService.getReservationById(id);
      await ReservationService.deleteReservation(
        id,
        reserva.usuario_id,
        esAdminORecepcion
      );
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
