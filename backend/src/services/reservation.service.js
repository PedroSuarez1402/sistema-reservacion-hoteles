import ReservationRepository from '../repositories/reservation.repository.js';
import RoomRepository from '../repositories/room.repository.js';

class ReservationService {
    static async createReservation(data) {
        const { usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado } = data;

        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);
        if (inicio >= fin) {
            throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
        }

        if (inicio < new Date()) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            inicio.setHours(0, 0, 0, 0);
            if (inicio < today) {
                throw new Error('La fecha de inicio no puede ser anterior al día actual');
            }
        }

        const habitacion = await RoomRepository.getById(habitacion_id);
        if (!habitacion) {
            throw new Error('La habitación no existe');
        }
        if (habitacion.estado === 'MANTENIMIENTO') {
            throw new Error('La habitación está en mantenimiento');
        }

        const estaDisponible = await ReservationRepository.checkAvailability(
            habitacion_id,
            inicio,
            fin
        );
        if (!estaDisponible) {
            throw new Error('La habitación no está disponible en este período');
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

    static async getAllReservations(filters = {}) {
        return await ReservationRepository.getAll({ where: filters });
    }

    static async getReservationById(id) {
        const reserva = await ReservationRepository.getById(id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        return reserva;
    }

    static async getReservationsByUser(usuario_id) {
        return await ReservationRepository.getByUsuarioId(usuario_id);
    }

    static async getReservationsByRoom(habitacion_id) {
        return await ReservationRepository.getByHabitacionId(habitacion_id);
    }

    static async cancelReservation(reserva_id, usuario_id) {
        const reserva = await ReservationRepository.getById(reserva_id, {
            includeUser: false,
            includeRoom: false,
        });

        if (!reserva) {
            throw new Error('Reserva no encontrada.');
        }

        if (reserva.usuario_id !== usuario_id) {
            throw new Error('No tienes permiso para cancelar esta reserva.');
        }

        if (reserva.estado === 'CANCELADA') {
            throw new Error('La reserva ya se encuentra cancelada.');
        }

        if (reserva.estado === 'FINALIZADA') {
            throw new Error('No puedes cancelar una reserva finalizada.');
        }

        return await ReservationRepository.updateStatus(reserva_id, 'CANCELADA');
    }

    static async updateReservation(id, usuario_id, data) {
        const reserva = await ReservationRepository.getById(id, {
            includeUser: false,
            includeRoom: false,
        });
        if (!reserva) {
            throw new Error('Reserva no encontrada.');
        }

        if (reserva.usuario_id !== usuario_id) {
            throw new Error('No tienes permiso para modificar esta reserva.');
        }

        if (reserva.estado === 'CANCELADA' || reserva.estado === 'FINALIZADA') {
            throw new Error('No se puede modificar una reserva cancelada o finalizada.');
        }

        const nuevoHabitacionId = data.habitacion_id || reserva.habitacion_id;
        const nuevaFechaInicio = data.fecha_inicio ? new Date(data.fecha_inicio) : new Date(reserva.fecha_inicio);
        const nuevaFechaFin = data.fecha_fin ? new Date(data.fecha_fin) : new Date(reserva.fecha_fin);

        if (nuevaFechaInicio >= nuevaFechaFin) {
            throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
        }

        const habitacion = await RoomRepository.getById(nuevoHabitacionId);
        if (!habitacion) {
            throw new Error('La habitación no existe');
        }
        if (habitacion.estado === 'MANTENIMIENTO') {
            throw new Error('La habitación está en mantenimiento');
        }

        const estaDisponible = await ReservationRepository.checkAvailability(
            nuevoHabitacionId,
            nuevaFechaInicio,
            nuevaFechaFin,
            id
        );
        if (!estaDisponible) {
            throw new Error('La habitación no está disponible en ese período.');
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
        if (data.estado) updateData.estado = data.estado;

        await ReservationRepository.update(id, updateData);

        return await ReservationRepository.getById(id);
    }

    static async deleteReservation(id, usuario_id, esAdmin = false) {
        const reserva = await ReservationRepository.getById(id, {
            includeUser: false,
            includeRoom: false,
        });
        if (!reserva) {
            throw new Error('Reserva no encontrada.');
        }

        if (!esAdmin && reserva.usuario_id !== usuario_id) {
            throw new Error('No tienes permiso para eliminar esta reserva.');
        }

        return await ReservationRepository.delete(id);
    }
}

export default ReservationService;
