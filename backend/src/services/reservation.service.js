import ReservationRepository from '../repositories/reservation.repository.js';
import RoomRepository from '../repositories/room.repository.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  assertRequired,
} from '../utils/errors.util.js';

// Servicio lógica negocio Reservaciones
class ReservationService {
    // Crea nueva reservación validando disponibilidad
    static async createReservation(data) {
        const { usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado } = data;

        assertRequired(usuario_id, 'El usuario es requerido');
        assertRequired(habitacion_id, 'La habitación es requerida');
        assertRequired(fecha_inicio, 'La fecha de inicio es requerida');
        assertRequired(fecha_fin, 'La fecha de fin es requerida');

        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);
        if (inicio >= fin) {
            throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const normalizedInicio = new Date(inicio);
        normalizedInicio.setHours(0, 0, 0, 0);
        if (normalizedInicio < today) {
            throw new BadRequestError('La fecha de inicio no puede ser anterior al día actual');
        }

        const habitacion = await RoomRepository.getById(habitacion_id);
        if (!habitacion) {
            throw new NotFoundError('La habitación no existe');
        }
        if (habitacion.estado === 'MANTENIMIENTO') {
            throw new UnprocessableEntityError('La habitación está en mantenimiento');
        }

        const estaDisponible = await ReservationRepository.checkAvailability(
            habitacion_id,
            inicio,
            fin
        );
        if (!estaDisponible) {
            throw new ConflictError('La habitación no está disponible en este período');
        }

        const diferenciaMilisegundos = fin.getTime() - inicio.getTime();
        const diasReserva = Math.max(1, Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24)));
        const precio_total = (diasReserva * parseFloat(habitacion.precio_noche)).toFixed(2);

        const nuevaReserva = await ReservationRepository.create({
            usuario_id,
            habitacion_id,
            fecha_inicio,
            fecha_fin,
            precio_total,
            estado: estado || 'CONFIRMADA',
        });

        return await ReservationRepository.getById(nuevaReserva.id);
    }

    // Obtiene lista todas las reservaciones con filtros
    static async getAllReservations(filters = {}) {
        return await ReservationRepository.getAll({ where: filters });
    }

    // Obtiene reservación por ID o lanza 404
    static async getReservationById(id) {
        assertRequired(id, 'El id de la reserva es requerido');
        const reserva = await ReservationRepository.getById(id);
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada');
        }
        return reserva;
    }

    // Obtiene reservaciones de un usuario por ID
    static async getReservationsByUser(usuario_id) {
        assertRequired(usuario_id, 'El id del usuario es requerido');
        return await ReservationRepository.getByUsuarioId(usuario_id);
    }

    // Obtiene reservaciones de una habitación por ID
    static async getReservationsByRoom(habitacion_id) {
        assertRequired(habitacion_id, 'El id de la habitación es requerido');
        return await ReservationRepository.getByHabitacionId(habitacion_id);
    }

    // Cancela reservación validando permisos y estado
    static async cancelReservation(reserva_id, usuarioQueSolicita) {
        assertRequired(reserva_id, 'El id de la reserva es requerido');
        assertRequired(usuarioQueSolicita, 'El usuario solicitante es requerido');

        const reserva = await ReservationRepository.getById(reserva_id, {
            includeUser: false,
            includeRoom: false,
        });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        const esAdminORecepcion =
            usuarioQueSolicita.rol === 'ADMIN' || usuarioQueSolicita.rol === 'RECEPCION';
        if (!esAdminORecepcion && reserva.usuario_id !== usuarioQueSolicita.id) {
            throw new ForbiddenError('No tienes permiso para cancelar esta reserva.');
        }

        if (reserva.estado === 'CANCELADA') {
            throw new ConflictError('La reserva ya se encuentra cancelada.');
        }
        if (reserva.estado === 'FINALIZADA') {
            throw new ConflictError('No puedes cancelar una reserva finalizada.');
        }

        return await ReservationRepository.updateStatus(reserva_id, 'CANCELADA');
    }

    // Actualiza reservación validando disponibilidad y permisos
    static async updateReservation(id, usuarioQueSolicita, data) {
        assertRequired(id, 'El id de la reserva es requerido');
        assertRequired(usuarioQueSolicita, 'El usuario solicitante es requerido');

        const reserva = await ReservationRepository.getById(id, {
            includeUser: false,
            includeRoom: false,
        });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        const esAdminORecepcion =
            typeof usuarioQueSolicita === 'object' &&
            (usuarioQueSolicita.rol === 'ADMIN' || usuarioQueSolicita.rol === 'RECEPCION');
        const usuarioId = typeof usuarioQueSolicita === 'object'
            ? usuarioQueSolicita.id
            : usuarioQueSolicita;

        if (!esAdminORecepcion && reserva.usuario_id !== usuarioId) {
            throw new ForbiddenError('No tienes permiso para modificar esta reserva.');
        }

        if (reserva.estado === 'CANCELADA' || reserva.estado === 'FINALIZADA') {
            throw new ConflictError('No se puede modificar una reserva cancelada o finalizada.');
        }

        const nuevoHabitacionId = data.habitacion_id || reserva.habitacion_id;
        const nuevaFechaInicio = data.fecha_inicio ? new Date(data.fecha_inicio) : new Date(reserva.fecha_inicio);
        const nuevaFechaFin = data.fecha_fin ? new Date(data.fecha_fin) : new Date(reserva.fecha_fin);

        if (nuevaFechaInicio >= nuevaFechaFin) {
            throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
        }

        const habitacion = await RoomRepository.getById(nuevoHabitacionId);
        if (!habitacion) {
            throw new NotFoundError('La habitación no existe');
        }
        if (habitacion.estado === 'MANTENIMIENTO') {
            throw new UnprocessableEntityError('La habitación está en mantenimiento');
        }

        const estaDisponible = await ReservationRepository.checkAvailability(
            nuevoHabitacionId,
            nuevaFechaInicio,
            nuevaFechaFin,
            id
        );
        if (!estaDisponible) {
            throw new ConflictError('La habitación no está disponible en ese período.');
        }

        const diferenciaMilisegundos = nuevaFechaFin.getTime() - nuevaFechaInicio.getTime();
        const diasReserva = Math.max(1, Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24)));
        const precio_total = (diasReserva * parseFloat(habitacion.precio_noche)).toFixed(2);

        const updateData = {
            habitacion_id: nuevoHabitacionId,
            fecha_inicio: nuevaFechaInicio,
            fecha_fin: nuevaFechaFin,
            precio_total,
        };
        if (data.estado && esAdminORecepcion) updateData.estado = data.estado;

        await ReservationRepository.update(id, updateData);

        return await ReservationRepository.getById(id);
    }

    // Elimina reservación validando permisos de usuario
    static async deleteReservation(id, usuarioQueSolicita, esAdminFlag = null) {
        assertRequired(id, 'El id de la reserva es requerido');

        const reserva = await ReservationRepository.getById(id, {
            includeUser: false,
            includeRoom: false,
        });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        const esAdmin = esAdminFlag === true ||
            (typeof usuarioQueSolicita === 'object' && usuarioQueSolicita.rol === 'ADMIN') ||
            (typeof usuarioQueSolicita === 'object' && usuarioQueSolicita.rol === 'RECEPCION');
        const usuarioId = typeof usuarioQueSolicita === 'object'
            ? usuarioQueSolicita.id
            : usuarioQueSolicita;

        if (!esAdmin && reserva.usuario_id !== usuarioId) {
            throw new ForbiddenError('No tienes permiso para eliminar esta reserva.');
        }

        return await ReservationRepository.delete(id);
    }
}

export default ReservationService;
