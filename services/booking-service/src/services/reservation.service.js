/**
 * Capa de Servicio para Reservaciones (Booking Service)
 * Coordina la verificación de disponibilidad y actúa como DIRECTOR del patrón Builder.
 */

import ReservationRepository from '../repositories/reservation.repository.js';
import ClienteRepository from '../repositories/cliente.repository.js';
import ClienteService from './cliente.service.js';
import { Paquete, Servicio } from '../models/index.js';
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
import ReservationBuilder from '../builders/reservation.builder.js';
import {
  CotizacionReserva,
  HospedajeItem,
  PaqueteCompuesto,
  ServicioSimple,
} from '../composite/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseLocalDate(input) {
    const str = String(input || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    }
    const d = new Date(str);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Consulta el precio por noche comunicándose por HTTP con Room Service.
 */
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

/**
 * Calcula el total a pagar según las noches y el precio unitario.
 */
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
    /**
   * Crea una reservación utilizando ReservationBuilder (Patrón Builder).
   * ReservationService actúa como DIRECTOR orquestando los pasos de ensamblado.
   */
    static async createReservation(data) {
        const {
            cliente_id,
            cliente_datos,
            acompanantes,
            usuario_id,
            habitacion_id,
            paquete_id,
            fecha_inicio,
            fecha_fin,
            estado,
            precio_total,
            notas,
            metodo_pago,
            tipo_reserva,
            anticipo,
            es_prorroga,
            observaciones_recepcion,
        } = data;

        // 1. Resolver el ID del cliente titular
        let targetClienteId = cliente_id || null;
        if (!targetClienteId && cliente_datos) {
            const resolvedClient = await ClienteService.findOrCreate(cliente_datos);
            targetClienteId = resolvedClient.id;
        }
        if (!targetClienteId && usuario_id) {
            targetClienteId = usuario_id;
        }

        assertRequired(targetClienteId, 'El cliente titular es requerido');
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

        // =====================================================================
        // Construcción de la Cotización mediante el PATRÓN COMPOSITE
        // =====================================================================
        const cotizacion = new CotizacionReserva();

        // 1. Componente Hoja (Leaf): Estancia de Hospedaje
        const precioNocheHabitacion = await resolvePrecioNoche(hid, { silentIfMissing: true });
        const itemHospedaje = new HospedajeItem({
            habitacionId: hid,
            noches: diasReserva,
            precioNoche: precioNocheHabitacion || 0,
        });
        cotizacion.agregar(itemHospedaje);

        // 2. Componente Compuesto (Composite): Paquete Turístico (si aplica)
        if (paquete_id) {
            const paqueteDB = await Paquete.findByPk(paquete_id, {
                include: [
                    {
                        model: Servicio,
                        as: 'servicios',
                        through: { attributes: ['cantidad'] },
                    },
                ],
            });

            if (!paqueteDB) {
                throw new NotFoundError('El paquete turístico seleccionado no existe');
            }

            // Instancia el Composite y le agrega sus Leaf (ServicioSimple)
            const paqueteComposite = new PaqueteCompuesto({
                paqueteId: paqueteDB.id,
                nombre: paqueteDB.nombre,
                descuentoPorcentaje: Number(paqueteDB.descuento_porcentaje) || 0,
                descripcion: paqueteDB.descripcion,
            });

            if (paqueteDB.servicios && Array.isArray(paqueteDB.servicios)) {
                for (const serv of paqueteDB.servicios) {
                    const cant = serv.PaqueteServicio?.cantidad || 1;
                    paqueteComposite.agregar(
                        new ServicioSimple({
                            servicioId: serv.id,
                            nombre: serv.nombre,
                            precioUnitario: Number(serv.precio),
                            cantidad: cant,
                            descripcion: serv.descripcion,
                        })
                    );
                }
            }

            cotizacion.agregar(paqueteComposite);
        }

        // Calcula el precio total final de forma polimórfica y recursiva
        const precioCalculadoComposite = cotizacion.calcularPrecio();

        // Si el cliente envió un precio_total manual explícito y no hay discrepancia fatal, respetamos
        let precioFinal = precioCalculadoComposite;
        if (precio_total && Number(precio_total) > 0) {
            precioFinal = Number(Number(precio_total).toFixed(2));
        }

        // ---- Uso de ReservationBuilder (Director construye paso a paso con el Composite) ----
        const builder = new ReservationBuilder()
            .conCliente(targetClienteId)
            .conHuesped(usuario_id || null)
            .conAcompanantes(acompanantes || [])
            .paraHabitacion(hid)
            .conFechas(fecha_inicio, fecha_fin)
            .conPaquete(paquete_id || null)
            .conCotizacion(cotizacion)
            .conTotalManual(precioFinal)
            .conEstado(estado || 'CONFIRMADA');
        if (notas) builder.conNotas(notas);
        if (metodo_pago) builder.conMetodoPago(metodo_pago);
        if (tipo_reserva) builder.conTipoReserva(tipo_reserva);
        if (anticipo !== undefined && anticipo !== null) builder.conAnticipo(anticipo);
        if (es_prorroga !== undefined && es_prorroga !== null) builder.conProrroga(es_prorroga);
        if (observaciones_recepcion) builder.conObservacionesRecepcion(observaciones_recepcion);

        // build() valida campos obligatorios y regresa payload compatible con Sequelize
        const payloadRepo = builder.build();

        const nuevaReserva = await ReservationRepository.create(payloadRepo);

        // 3. Registrar acompañantes vinculados a esta reservación y al cliente
        if (Array.isArray(acompanantes) && acompanantes.length > 0) {
            for (const ac of acompanantes) {
                if (ac && ac.nombre && String(ac.nombre).trim().length > 0) {
                    await ClienteRepository.addAcompanante(targetClienteId, {
                        nombre: String(ac.nombre).trim(),
                        documento: ac.documento ? String(ac.documento).trim() : null,
                        parentesco: ac.parentesco ? String(ac.parentesco).trim() : 'Familiar',
                        telefono: ac.telefono ? String(ac.telefono).trim() : null,
                        reserva_id: nuevaReserva.id,
                    });
                }
            }
        }

        // =====================================================================
        // Publicación de Evento al Message Broker (Patrón Pub/Sub - Publisher)
        // =====================================================================
        const RESERVA_COMPLETA = await ReservationRepository.getById(nuevaReserva.id);
        const BROKER_URL = process.env.BROKER_URL || 'http://localhost:4003';
        const brokerEvento = {
            topico: 'RESERVA_CREADA',
            payload: {
                id: RESERVA_COMPLETA.id,
                cliente_id: RESERVA_COMPLETA.cliente_id,
                cliente_nombre: RESERVA_COMPLETA.cliente?.nombre,
                cliente_documento: RESERVA_COMPLETA.cliente?.documento,
                acompanantes_count: RESERVA_COMPLETA.acompanantes?.length || 0,
                usuario_id: RESERVA_COMPLETA.usuario_id,
                habitacion_id: RESERVA_COMPLETA.habitacion_id,
                fecha_inicio: RESERVA_COMPLETA.fecha_inicio,
                fecha_fin: RESERVA_COMPLETA.fecha_fin,
                noches: Math.max(1, Math.round(
                    (parseLocalDate(RESERVA_COMPLETA.fecha_fin) - parseLocalDate(RESERVA_COMPLETA.fecha_inicio)) /
                    (1000 * 60 * 60 * 24)
                )),
                precio_total: Number(RESERVA_COMPLETA.precio_total),
                estado: RESERVA_COMPLETA.estado,
                creado_en: RESERVA_COMPLETA.createdAt || new Date().toISOString(),
            },
            publishedBy: 'booking-service',
        };
        // Emisión asíncrona no bloqueante (Fire-and-forget con timeout de 5s)
        setImmediate(function publishEventoReservaCreadaNoBloqueante() {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            fetch(`${BROKER_URL}/api/broker/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-publisher': 'booking-service' },
                body: JSON.stringify(brokerEvento),
                signal: controller.signal,
            })
                .then(async (r) => {
                    if (!r.ok) {
                        try {
                            const body = await r.json().catch(() => null);
                            console.warn(
                                `⚠️  [Pub/Sub] Broker respondió ${r.status} al publicar RESERVA_CREADA ${RESERVA_COMPLETA.id}. Body=`,
                                body
                            );
                        } catch (_) { /* ignore json parse */ }
                        return;
                    }
                    try {
                        const body = await r.json().catch(() => null);
                        console.log(
                            `📨 [Pub/Sub] RESERVA_CREADA ${RESERVA_COMPLETA.id} → Broker ✔ ` +
                            (body && body.eventId ? `eventId=${body.eventId} ` : '') +
                            (body && body.pendingSubscribers ? `subs=${body.pendingSubscribers}` : '')
                        );
                    } catch (_) { /* ignore */ }
                })
                .catch(function onBrokerNoDisponible(err) {
                    console.warn(
                        `⚠️  [Pub/Sub] Broker no disponible en ${BROKER_URL} al publicar RESERVA_CREADA ${RESERVA_COMPLETA.id}. ` +
                        `(no crítico, reserva persistida OK). Error: ${err && err.code ? err.code : (err && err.message) || err}`
                    );
                })
                .finally(() => clearTimeout(timer));
        });
        // ================== [FIN Pub/Sub Async] ===============================

        return RESERVA_COMPLETA;
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

        /**
         * Valida y actualiza el precio total si se proporciona.
         */
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
        if (data.cliente_id !== undefined) updateData.cliente_id = data.cliente_id || null;
        if (data.estado && esAdminORecepcion) updateData.estado = data.estado;
        if (data.paquete_id !== undefined) updateData.paquete_id = data.paquete_id || null;
        if (data.metodo_pago !== undefined) updateData.metodo_pago = String(data.metodo_pago).trim().toUpperCase();
        if (data.tipo_reserva !== undefined) updateData.tipo_reserva = String(data.tipo_reserva).trim().toUpperCase();
        if (data.anticipo !== undefined && data.anticipo !== null) updateData.anticipo = Number(data.anticipo) || 0;
        if (data.observaciones_recepcion !== undefined) updateData.observaciones_recepcion = data.observaciones_recepcion;
        if (data.notas !== undefined) updateData.notas = data.notas;

        await ReservationRepository.update(id, updateData);

        if (Array.isArray(data.acompanantes) && (reserva.cliente_id || data.cliente_id)) {
            const cid = data.cliente_id || reserva.cliente_id;
            for (const ac of data.acompanantes) {
                if (ac && ac.nombre && String(ac.nombre).trim().length > 0) {
                    await ClienteRepository.addAcompanante(cid, {
                        nombre: String(ac.nombre).trim(),
                        documento: ac.documento ? String(ac.documento).trim() : null,
                        parentesco: ac.parentesco ? String(ac.parentesco).trim() : 'Familiar',
                        telefono: ac.telefono ? String(ac.telefono).trim() : null,
                        reserva_id: id,
                    });
                }
            }
        }

        return await ReservationRepository.getById(id);
    }

    /**
     * Elimina una reservación validando permisos de usuario.
     */
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

    /**
     * Transición a Check-in: actualiza estado a 'CONFIRMADA' y registra timestamp en observaciones.
     */
    static async checkIn(id, usuarioQueSolicita, data = {}) {
        assertRequired(id, 'El id de la reserva es requerido');
        const reserva = await ReservationRepository.getById(id, { includeUser: false });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        if (reserva.estado === 'CANCELADA') {
            throw new ConflictError('No se puede realizar check-in a una reserva cancelada.');
        }
        if (reserva.estado === 'FINALIZADA') {
            throw new ConflictError('No se puede realizar check-in a una reserva finalizada.');
        }

        const now = new Date();
        const timestampStr = now.toISOString();
        const notaAdicional = data.observaciones ? ` - ${data.observaciones}` : '';
        const entradaCheckIn = `[Check-in: ${timestampStr}]${notaAdicional}`;
        const prevObs = reserva.observaciones_recepcion
            ? `${reserva.observaciones_recepcion}\n${entradaCheckIn}`
            : entradaCheckIn;

        const updateData = {
            estado: 'CONFIRMADA',
            observaciones_recepcion: prevObs,
        };

        if (data.metodo_pago) {
            updateData.metodo_pago = String(data.metodo_pago).trim().toUpperCase();
        }
        if (data.anticipo !== undefined && data.anticipo !== null) {
            updateData.anticipo = Number(data.anticipo) || 0;
        }

        await ReservationRepository.update(id, updateData);
        return await ReservationRepository.getById(id);
    }

    /**
     * Transición a Check-out: actualiza estado a 'FINALIZADA'.
     */
    static async checkOut(id, usuarioQueSolicita, data = {}) {
        assertRequired(id, 'El id de la reserva es requerido');
        const reserva = await ReservationRepository.getById(id, { includeUser: false });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        if (reserva.estado === 'CANCELADA') {
            throw new ConflictError('No se puede realizar check-out a una reserva cancelada.');
        }
        if (reserva.estado === 'FINALIZADA') {
            throw new ConflictError('La reserva ya se encuentra finalizada.');
        }

        const now = new Date();
        const timestampStr = now.toISOString();
        const notaAdicional = data.observaciones ? ` - ${data.observaciones}` : '';
        const entradaCheckOut = `[Check-out: ${timestampStr}]${notaAdicional}`;
        const prevObs = reserva.observaciones_recepcion
            ? `${reserva.observaciones_recepcion}\n${entradaCheckOut}`
            : entradaCheckOut;

        await ReservationRepository.update(id, {
            estado: 'FINALIZADA',
            observaciones_recepcion: prevObs,
        });

        return await ReservationRepository.getById(id);
    }

    /**
     * Prórroga de estadía: marca es_prorroga: true y guarda nota de retraso/prórroga.
     */
    static async prorroga(id, usuarioQueSolicita, data = {}) {
        assertRequired(id, 'El id de la reserva es requerido');
        const reserva = await ReservationRepository.getById(id, { includeUser: false });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        if (reserva.estado === 'CANCELADA' || reserva.estado === 'FINALIZADA') {
            throw new ConflictError('No se puede prorrogar una reserva cancelada o finalizada.');
        }

        const motivo = data.motivo || data.observaciones || 'Retraso de salida acordado en recepción';
        const now = new Date();
        const timestampStr = now.toISOString();
        const entradaProrroga = `[Prórroga: ${timestampStr}] ${motivo}`;
        const prevObs = reserva.observaciones_recepcion
            ? `${reserva.observaciones_recepcion}\n${entradaProrroga}`
            : entradaProrroga;

        const updateData = {
            es_prorroga: true,
            observaciones_recepcion: prevObs,
        };

        if (data.nueva_fecha_fin) {
            const nuevaFechaFin = parseLocalDate(data.nueva_fecha_fin);
            const fechaInicioActual = parseLocalDate(reserva.fecha_inicio);
            if (nuevaFechaFin <= fechaInicioActual) {
                throw new BadRequestError('La nueva fecha de salida debe ser posterior a la fecha de inicio');
            }
            const disponible = await ReservationRepository.checkAvailability(
                reserva.habitacion_id,
                fechaInicioActual,
                nuevaFechaFin,
                reserva.id
            );
            if (!disponible) {
                throw new ConflictError('La habitación no se encuentra disponible hasta la nueva fecha solicitada.');
            }
            updateData.fecha_fin = nuevaFechaFin;
        }

        await ReservationRepository.update(id, updateData);
        return await ReservationRepository.getById(id);
    }

    /**
     * Transición a No-Show: actualiza estado a 'CANCELADA' con nota 'No-Show sin preaviso'.
     */
    static async noShow(id, usuarioQueSolicita, data = {}) {
        assertRequired(id, 'El id de la reserva es requerido');
        const reserva = await ReservationRepository.getById(id, { includeUser: false });
        if (!reserva) {
            throw new NotFoundError('Reserva no encontrada.');
        }

        if (reserva.estado === 'CANCELADA') {
            throw new ConflictError('La reserva ya se encuentra cancelada.');
        }
        if (reserva.estado === 'FINALIZADA') {
            throw new ConflictError('No se puede marcar como No-Show una reserva finalizada.');
        }

        const now = new Date();
        const timestampStr = now.toISOString();
        const detalle = data.observaciones ? ` - ${data.observaciones}` : '';
        const entradaNoShow = `[No-Show sin preaviso: ${timestampStr}] Huésped no se presentó a tiempo${detalle}`;
        const prevObs = reserva.observaciones_recepcion
            ? `${reserva.observaciones_recepcion}\n${entradaNoShow}`
            : entradaNoShow;

        await ReservationRepository.update(id, {
            estado: 'CANCELADA',
            observaciones_recepcion: prevObs,
        });

        return await ReservationRepository.getById(id);
    }
}

export default ReservationService;
