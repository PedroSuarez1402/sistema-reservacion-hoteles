import ReservationRepository from '../repositories/reservation.repository.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnprocessableEntityError,
  assertRequired,
} from '../utils/errors.util.js';
import { getRoomById, RoomNotFoundError, RoomServiceUnavailableError } from '../clients/room-client.js';

// Regex UUID v4 + UUIDs legacy ceros (seed: xxxxxxxx-0000-0000-0000-xxxxxxxxxxxx)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Interpreta un YYYY-MM-DD como FECHA LOCAL (no UTC), evitando off-by-1 día por timezone.
function parseLocalDate(input) {
    const str = String(input || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    }
    const d = new Date(str);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

// Consulta room-service por precio_noche. Devuelve Number(precio_noche) o lanza error.
async function resolvePrecioNoche(habitacionId, op = { silentIfMissing: false }) {
    let room = null;
    try {
        room = await getRoomById(habitacionId);
    } catch (err) {
        if (err instanceof RoomServiceUnavailableError) {
            if (op.silentIfMissing) return null;
            throw new InternalServerError(
                `No se pudo calcular el precio total: ${err.message}`
            );
        }
        throw err;
    }
    if (!room) {
        if (op.silentIfMissing) return null;
        throw new NotFoundError(
            `No se pudo calcular el precio total: la habitación (${habitacionId}) no existe en el catálogo.`
        );
    }
    const precioNoche = Number(room.precio_noche);
    if (!Number.isFinite(precioNoche) || precioNoche <= 0) {
        if (op.silentIfMissing) return null;
        throw new BadRequestError(
            `No se pudo calcular el precio total: la habitación ${room.numero ? `#${room.numero}` : ''} tiene un precio por noche inválido.`
        );
    }
    return precioNoche;
}

// Calcula precio_total final validando y usando fallback REST contra room-service.
async function calcularPrecioTotal({ precioTotalInput, habitacionId, diasReserva, allowRemoteLookup = true, precioNocheLocal = null }) {
    let precioNum = Number(precioTotalInput);
    const vieneInput =
        precioTotalInput !== undefined &&
        precioTotalInput !== null &&
        precioTotalInput !== '' &&
        !Number.isNaN(precioNum);
    if (vieneInput) {
        if (!Number.isFinite(precioNum) || precioNum <= 0) {
            throw new BadRequestError('El precio total debe ser mayor a 0');
        }
        return Number(precioNum.toFixed(2));
    }
    if (!allowRemoteLookup) {
        // No hay precio explícito y no está permitido consultar catálogo: error, pero intentamos usar precioNoche local si lo pasaron.
        if (precioNocheLocal && Number.isFinite(Number(precioNocheLocal)) && Number(precioNocheLocal) > 0) {
            return Number((Number(precioNocheLocal) * diasReserva).toFixed(2));
        }
        throw new BadRequestError('El precio total es requerido');
    }
    const precioNoche = precioNocheLocal && Number(precioNocheLocal) > 0
        ? Number(precioNocheLocal)
        : await resolvePrecioNoche(habitacionId);
    if (precioNoche === null || !Number.isFinite(precioNoche) || precioNoche <= 0) {
        throw new BadRequestError('El precio total es requerido y no se pudo calcular automáticamente. Por favor inténtalo de nuevo.');
    }
    return Number((precioNoche * diasReserva).toFixed(2));
}

// Servicio lógica negocio Reservaciones (DESACOPLADO de Room - UUID simple)
class ReservationService {
    // Crea nueva reservación validando disponibilidad (habitacion_id=UUID agnóstico)
    static async createReservation(data) {
        const { usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado, precio_total } = data;

        assertRequired(usuario_id, 'El usuario es requerido');
        assertRequired(habitacion_id, 'La habitación es requerida');
        assertRequired(fecha_inicio, 'La fecha de inicio es requerida');
        assertRequired(fecha_fin, 'La fecha de fin es requerida');

        // habitacion_id es UUID simple (no FK), pero validamos formato para no insertar basura
        const hid = String(habitacion_id).trim();
        if (!UUID_REGEX.test(hid)) {
            throw new BadRequestError('El ID de habitación debe ser un UUID válido');
        }

        const inicio = parseLocalDate(fecha_inicio);
        const fin = parseLocalDate(fecha_fin);
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

        const estaDisponible = await ReservationRepository.checkAvailability(
            hid,
            inicio,
            fin
        );
        if (!estaDisponible) {
            throw new ConflictError('La habitación no está disponible en este período');
        }

        const diferenciaMilisegundos = fin.getTime() - inicio.getTime();
        const diasReserva = Math.max(1, Math.round(diferenciaMilisegundos / (1000 * 60 * 60 * 24)));
        const precioGuardar = await calcularPrecioTotal({
            precioTotalInput: precio_total,
            habitacionId: hid,
            diasReserva,
        });

        const nuevaReserva = await ReservationRepository.create({
            usuario_id,
            habitacion_id: hid,
            fecha_inicio,
            fecha_fin,
            precio_total: precioGuardar,
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

        const reserva = await ReservationRepository.getById(reserva_id, { includeUser: false });
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

    // Actualiza reservación validando disponibilidad y permisos (SIN dependencia de Room)
    static async updateReservation(id, usuarioQueSolicita, data) {
        assertRequired(id, 'El id de la reserva es requerido');
        assertRequired(usuarioQueSolicita, 'El usuario solicitante es requerido');

        const reserva = await ReservationRepository.getById(id, { includeUser: false });
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

        let nuevoHabitacionId = reserva.habitacion_id;
        if (data.habitacion_id !== undefined && data.habitacion_id !== null && data.habitacion_id !== '') {
            nuevoHabitacionId = String(data.habitacion_id).trim();
            if (!UUID_REGEX.test(nuevoHabitacionId)) {
                throw new BadRequestError('El ID de habitación debe ser un UUID válido');
            }
        }
        const nuevaFechaInicio = data.fecha_inicio ? parseLocalDate(data.fecha_inicio) : parseLocalDate(reserva.fecha_inicio);
        const nuevaFechaFin = data.fecha_fin ? parseLocalDate(data.fecha_fin) : parseLocalDate(reserva.fecha_fin);

        if (nuevaFechaInicio >= nuevaFechaFin) {
            throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
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
        const diasReserva = Math.max(1, Math.round(diferenciaMilisegundos / (1000 * 60 * 60 * 24)));

        const updateData = {
            habitacion_id: nuevoHabitacionId,
            fecha_inicio: nuevaFechaInicio,
            fecha_fin: nuevaFechaFin,
        };
        const precioInput = data.precio_total;
        const vienePrecioInput =
            precioInput !== undefined && precioInput !== null && precioInput !== '';
        const cambiaFechas =
            data.fecha_inicio !== undefined || data.fecha_fin !== undefined;
        const cambiaHabitacion =
            data.habitacion_id !== undefined &&
            data.habitacion_id !== null &&
            data.habitacion_id !== '';
        const precioAnteriorInvalido =
            reserva.precio_total === undefined ||
            reserva.precio_total === null ||
            !Number.isFinite(Number(reserva.precio_total)) ||
            Number(reserva.precio_total) <= 0;

        if (vienePrecioInput) {
            const precioUpdate = Number(precioInput);
            if (Number.isNaN(precioUpdate) || !Number.isFinite(precioUpdate) || precioUpdate <= 0) {
                throw new BadRequestError('El precio total debe ser mayor a 0');
            }
            updateData.precio_total = Number(precioUpdate.toFixed(2));
        } else if (cambiaHabitacion || cambiaFechas || precioAnteriorInvalido) {
            updateData.precio_total = await calcularPrecioTotal({
                precioTotalInput: undefined,
                habitacionId: nuevoHabitacionId,
                diasReserva,
            });
        }
        if (data.estado && esAdminORecepcion) updateData.estado = data.estado;

        await ReservationRepository.update(id, updateData);

        return await ReservationRepository.getById(id);
    }

    // Elimina reservación validando permisos de usuario
    static async deleteReservation(id, usuarioQueSolicita, esAdminFlag = null) {
        assertRequired(id, 'El id de la reserva es requerido');

        const reserva = await ReservationRepository.getById(id, { includeUser: false });
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
