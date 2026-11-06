/**
 * Capa de Servicio para Reservaciones (Booking Service)
 *
 * Orquesta los patrones de diseño del núcleo arquitectónico:
 * 1. Chain of Responsibility (`src/patterns/chain/`) -> Validación secuencial con `validationTrace`
 * 2. Composite (`src/composite/`)                    -> Cálculo jerárquico de costos (Hospedaje + Paquetes + Servicios)
 * 3. Builder (`src/builders/reservation.builder.js`) -> Ensamblaje paso a paso de la reservación
 * 4. Observer (`src/patterns/observer/`)             -> Notificación reactiva (`notificationTrace`) hacia WhatsApp,
 *                                                       Housekeeping (room-service), AuditLog y Message Broker (Pub/Sub)
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
  assertRequired,
} from '../utils/errors.util.js';
import {
  getRoomById,
  getAllRooms,
  RoomServiceUnavailableError,
} from '../clients/room-client.js';
import ReservationBuilder from '../builders/reservation.builder.js';
import {
  CotizacionReserva,
  HospedajeItem,
  PaqueteCompuesto,
  ServicioSimple,
} from '../composite/index.js';
import {
  createReservationValidationChain,
  parseLocalDate,
} from '../patterns/chain/index.js';
import {
  reservationEventManager,
  AuditLogObserver,
} from '../patterns/observer/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adjunta `validationTrace`, `notificationTrace` y metadatos adicionales a una instancia
 * de Sequelize (o a un objeto plano) garantizando que `JSON.stringify` / `.toJSON()` los incluya.
 */
function attachTracesToReservation(
  reservaInstance,
  { validationTrace = [], notificationTrace = [], extra = {} } = {}
) {
  if (!reservaInstance) return null;

  if (typeof reservaInstance.setDataValue === 'function') {
    reservaInstance.setDataValue('validationTrace', validationTrace);
    reservaInstance.setDataValue('notificationTrace', notificationTrace);
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) {
        reservaInstance.setDataValue(k, v);
      }
    }
  }

  reservaInstance.validationTrace = validationTrace;
  reservaInstance.notificationTrace = notificationTrace;
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) {
      reservaInstance[k] = v;
    }
  }

  return reservaInstance;
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
      `No se pudo calcular el precio total: la habitación ${
        room.numero ? `#${room.numero}` : ''
      } tiene un precio por noche inválido.`
    );
  }
  return precioNoche;
}

/**
 * Calcula el total a pagar según las noches y el precio unitario.
 */
async function calcularPrecioTotal({
  precioTotalInput,
  habitacionId,
  diasReserva,
  allowRemoteLookup = true,
  precioNocheLocal = null,
}) {
  const precioNum = Number(precioTotalInput);
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
    if (
      precioNocheLocal &&
      Number.isFinite(Number(precioNocheLocal)) &&
      Number(precioNocheLocal) > 0
    ) {
      return Number((Number(precioNocheLocal) * diasReserva).toFixed(2));
    }
    throw new BadRequestError('El precio total es requerido');
  }
  const precioNoche =
    precioNocheLocal && Number(precioNocheLocal) > 0
      ? Number(precioNocheLocal)
      : await resolvePrecioNoche(habitacionId);
  if (precioNoche === null || !Number.isFinite(precioNoche) || precioNoche <= 0) {
    throw new BadRequestError(
      'El precio total es requerido y no se pudo calcular automáticamente. Por favor inténtalo de nuevo.'
    );
  }
  return Number((precioNoche * diasReserva).toFixed(2));
}

class ReservationService {
  /**
   * Crea una reservación orquestando los 4 patrones:
   * 1. Chain of Responsibility -> valida fechas, estado/capacidad habitación, traslapes y políticas de paquetes.
   * 2. Composite               -> calcula costos jerárquicos (HospedajeItem + PaqueteCompuesto + ServicioSimple).
   * 3. Builder                 -> ensambla y valida la entidad Reservation.
   * 4. Observer (+ Pub/Sub)    -> notifica 'RESERVA_CREADA' a todos los observadores activos.
   */
  static async createReservation(data) {
    const {
      cliente_id,
      cliente_datos,
      acompanantes,
      usuario_id,
      habitacion_id,
      paquete_id,
      servicios_adicionales,
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

    // =====================================================================
    // PASO 1: PATRÓN CHAIN OF RESPONSIBILITY (Validación Secuencial)
    // DateCoherenceHandler -> RoomStatusAndCapacityHandler ->
    // OverlapAvailabilityHandler -> PricingAndPackagePolicyHandler
    // =====================================================================
    const validationContext = {
      cliente_id: targetClienteId,
      usuario_id: usuario_id || null,
      acompanantes: Array.isArray(acompanantes) ? acompanantes : [],
      habitacion_id,
      paquete_id: paquete_id || null,
      servicios_adicionales: Array.isArray(servicios_adicionales)
        ? servicios_adicionales
        : [],
      fecha_inicio,
      fecha_fin,
      precio_total,
      anticipo,
      validationTrace: [],
    };

    const validationChain = createReservationValidationChain();
    await validationChain.handle(validationContext);

    const hid = validationContext.habitacionIdNormalizado;
    const diasReserva = validationContext.diasReserva;
    const validationTrace = validationContext.validationTrace;

    // =====================================================================
    // PASO 2: PATRÓN COMPOSITE (Cálculo Polimórfico de Costos)
    // =====================================================================
    const cotizacion = new CotizacionReserva();

    // 2.1 Componente Hoja (Leaf): Estancia de Hospedaje
    const precioNocheHabitacion =
      validationContext.precioNocheHabitacion ||
      (await resolvePrecioNoche(hid, { silentIfMissing: true })) ||
      0;

    const itemHospedaje = new HospedajeItem({
      habitacionId: hid,
      numeroHabitacion: validationContext.room?.numero || '',
      noches: diasReserva,
      precioNoche: precioNocheHabitacion,
    });
    cotizacion.agregar(itemHospedaje);

    // 2.2 Componente Compuesto (Composite): Paquete Turístico (si aplica)
    if (validationContext.paqueteDB) {
      const paqueteDB = validationContext.paqueteDB;
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

    // 2.3 Componentes Hoja (Leaf): Servicios adicionales individuales (si aplica)
    if (
      Array.isArray(validationContext.serviciosAdicionalesResueltos) &&
      validationContext.serviciosAdicionalesResueltos.length > 0
    ) {
      for (const { servicio, cantidad } of validationContext.serviciosAdicionalesResueltos) {
        cotizacion.agregar(
          new ServicioSimple({
            servicioId: servicio.id,
            nombre: servicio.nombre,
            precioUnitario: Number(servicio.precio),
            cantidad,
            descripcion: servicio.descripcion,
          })
        );
      }
    }

    const precioCalculadoComposite = cotizacion.calcularPrecio();

    let precioFinal = precioCalculadoComposite;
    if (precio_total && Number(precio_total) > 0 && precioCalculadoComposite <= 0) {
      precioFinal = Number(Number(precio_total).toFixed(2));
    } else if (precio_total && Number(precio_total) > 0 && !paquete_id && (!servicios_adicionales || servicios_adicionales.length === 0)) {
      precioFinal = Number(Number(precio_total).toFixed(2));
    }

    // =====================================================================
    // PASO 3: PATRÓN BUILDER (Ensamblaje Paso a Paso de la Reserva)
    // =====================================================================
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
    if (observaciones_recepcion) {
      builder.conObservacionesRecepcion(observaciones_recepcion);
    }

    const payloadRepo = builder.build();
    const nuevaReserva = await ReservationRepository.create(payloadRepo);

    // Registrar acompañantes vinculados a esta reservación y al cliente
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

    const reservaCompleta = await ReservationRepository.getById(nuevaReserva.id);

    // =====================================================================
    // PASO 4: PATRÓN OBSERVER + PUB/SUB BRIDGE
    // Notifica a WhatsAppNotificationObserver, RoomHousekeepingObserver,
    // AuditLogObserver y MessageBrokerBridgeObserver (:4003)
    // =====================================================================
    const notificationTrace = await reservationEventManager.notify(
      'RESERVA_CREADA',
      reservaCompleta
    );

    return attachTracesToReservation(reservaCompleta, {
      validationTrace,
      notificationTrace,
      extra: {
        cotizacion_desglose: cotizacion.obtenerDesglose(),
      },
    });
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

  /**
   * Cancela reservación validando permisos y estado, y dispara el evento
   * 'RESERVA_CANCELADA' a través del ReservationEventManager (Patrón Observer).
   */
  static async cancelReservation(reserva_id, usuarioQueSolicita) {
    assertRequired(reserva_id, 'El id de la reserva es requerido');
    assertRequired(usuarioQueSolicita, 'El usuario solicitante es requerido');

    const reserva = await ReservationRepository.getById(reserva_id, {
      includeUser: false,
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

    const validationTrace = [
      {
        order: 1,
        handler: 'CancellationPolicyValidation',
        step: 'Validación de Permisos y Estado para Cancelación',
        status: 'PASSED',
        message: `Cancelación autorizada (estado previo: ${reserva.estado}).`,
        details: {
          reserva_id,
          estado_previo: reserva.estado,
          estado_nuevo: 'CANCELADA',
        },
        timestamp: new Date().toISOString(),
      },
    ];

    const reservaCancelada = await ReservationRepository.updateStatus(
      reserva_id,
      'CANCELADA'
    );

    const notificationTrace = await reservationEventManager.notify(
      'RESERVA_CANCELADA',
      reservaCancelada
    );

    return attachTracesToReservation(reservaCancelada, {
      validationTrace,
      notificationTrace,
    });
  }

  // Actualiza reservación validando disponibilidad y permisos
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
    const usuarioId =
      typeof usuarioQueSolicita === 'object'
        ? usuarioQueSolicita.id
        : usuarioQueSolicita;

    if (!esAdminORecepcion && reserva.usuario_id !== usuarioId) {
      throw new ForbiddenError('No tienes permiso para modificar esta reserva.');
    }

    if (reserva.estado === 'CANCELADA' || reserva.estado === 'FINALIZADA') {
      throw new ConflictError(
        'No se puede modificar una reserva cancelada o finalizada.'
      );
    }

    let nuevoHabitacionId = reserva.habitacion_id;
    if (
      data.habitacion_id !== undefined &&
      data.habitacion_id !== null &&
      data.habitacion_id !== ''
    ) {
      nuevoHabitacionId = String(data.habitacion_id).trim();
      if (!UUID_REGEX.test(nuevoHabitacionId)) {
        throw new BadRequestError('El ID de habitación debe ser un UUID válido');
      }
    }
    const nuevaFechaInicio = data.fecha_inicio
      ? parseLocalDate(data.fecha_inicio)
      : parseLocalDate(reserva.fecha_inicio);
    const nuevaFechaFin = data.fecha_fin
      ? parseLocalDate(data.fecha_fin)
      : parseLocalDate(reserva.fecha_fin);

    if (nuevaFechaInicio >= nuevaFechaFin) {
      throw new BadRequestError(
        'La fecha de inicio debe ser anterior a la fecha de fin'
      );
    }

    if (cambiaHabitacion) {
      const room = await getRoomById(nuevoHabitacionId);
      if (room && String(room.estado).toUpperCase() === 'MANTENIMIENTO') {
        throw new ConflictError(
          `La habitación #${room.numero || nuevoHabitacionId} se encuentra en MANTENIMIENTO y no puede ser reservada`
        );
      }
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

    const diferenciaMilisegundos =
      nuevaFechaFin.getTime() - nuevaFechaInicio.getTime();
    const diasReserva = Math.max(
      1,
      Math.round(diferenciaMilisegundos / (1000 * 60 * 60 * 24))
    );

    // =====================================================================
    // Cálculo jerárquico de precios con el PATRÓN COMPOSITE
    // CotizacionReserva (Composite Root) -> HospedajeItem (Leaf) + PaqueteCompuesto (Composite)
    // =====================================================================
    const targetPaqueteId =
      data.paquete_id !== undefined ? (data.paquete_id || null) : reserva.paquete_id;

    const cotizacion = new CotizacionReserva();
    const precioNocheHabitacion =
      (await resolvePrecioNoche(nuevoHabitacionId, { silentIfMissing: true })) || 0;

    cotizacion.agregar(
      new HospedajeItem({
        habitacionId: nuevoHabitacionId,
        noches: diasReserva,
        precioNoche: precioNocheHabitacion,
      })
    );

    if (targetPaqueteId) {
      const paqueteDB = await Paquete.findByPk(targetPaqueteId, {
        include: [
          {
            model: Servicio,
            as: 'servicios',
            through: { attributes: ['cantidad'] },
          },
        ],
      });

      if (paqueteDB) {
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
    }

    const precioCalculadoComposite = cotizacion.calcularPrecio();

    const precioInput = data.precio_total;
    const vienePrecioInput =
      precioInput !== undefined && precioInput !== null && precioInput !== '';
    const cambiaFechas =
      data.fecha_inicio !== undefined || data.fecha_fin !== undefined;
    const cambiaHabitacionFlag =
      data.habitacion_id !== undefined &&
      data.habitacion_id !== null &&
      data.habitacion_id !== '';
    const precioAnteriorInvalido =
      reserva.precio_total === undefined ||
      reserva.precio_total === null ||
      !Number.isFinite(Number(reserva.precio_total)) ||
      Number(reserva.precio_total) <= 0;

    let precioFinal = precioCalculadoComposite;
    if (vienePrecioInput) {
      const precioUpdate = Number(precioInput);
      if (
        Number.isNaN(precioUpdate) ||
        !Number.isFinite(precioUpdate) ||
        precioUpdate <= 0
      ) {
        throw new BadRequestError('El precio total debe ser mayor a 0');
      }
      precioFinal = Number(precioUpdate.toFixed(2));
    } else if (
      !cambiaHabitacionFlag &&
      !cambiaFechas &&
      data.paquete_id === undefined &&
      !precioAnteriorInvalido
    ) {
      precioFinal = Number(Number(reserva.precio_total).toFixed(2));
    }

    // =====================================================================
    // Ensamblaje y validación con el PATRÓN BUILDER (ReservationBuilder)
    // =====================================================================
    const targetClienteId =
      data.cliente_id !== undefined ? (data.cliente_id || null) : reserva.cliente_id;
    const nuevoEstado =
      data.estado && esAdminORecepcion ? data.estado : reserva.estado;

    const builder = new ReservationBuilder()
      .conCliente(targetClienteId)
      .conHuesped(reserva.usuario_id)
      .paraHabitacion(nuevoHabitacionId)
      .conFechas(nuevaFechaInicio, nuevaFechaFin)
      .conPaquete(targetPaqueteId)
      .conCotizacion(cotizacion)
      .conTotalManual(precioFinal)
      .conEstado(nuevoEstado);

    const metodoPagoVal =
      data.metodo_pago !== undefined ? data.metodo_pago : reserva.metodo_pago;
    if (metodoPagoVal) builder.conMetodoPago(metodoPagoVal);

    const tipoReservaVal =
      data.tipo_reserva !== undefined ? data.tipo_reserva : reserva.tipo_reserva;
    if (tipoReservaVal) builder.conTipoReserva(tipoReservaVal);

    const anticipoVal =
      data.anticipo !== undefined && data.anticipo !== null
        ? data.anticipo
        : reserva.anticipo;
    if (anticipoVal !== undefined && anticipoVal !== null) {
      builder.conAnticipo(anticipoVal);
    }

    const esProrrogaVal =
      data.es_prorroga !== undefined && data.es_prorroga !== null
        ? data.es_prorroga
        : reserva.es_prorroga;
    if (esProrrogaVal !== undefined && esProrrogaVal !== null) {
      builder.conProrroga(esProrrogaVal);
    }

    const notasVal = data.notas !== undefined ? data.notas : reserva.notas;
    if (notasVal !== undefined && notasVal !== null) {
      builder.conNotas(notasVal);
    }

    const obsVal =
      data.observaciones_recepcion !== undefined
        ? data.observaciones_recepcion
        : reserva.observaciones_recepcion;
    if (obsVal !== undefined && obsVal !== null) {
      builder.conObservacionesRecepcion(obsVal);
    }

    const payloadRepo = builder.build();
    await ReservationRepository.update(id, payloadRepo);

    if (
      Array.isArray(data.acompanantes) &&
      (reserva.cliente_id || data.cliente_id)
    ) {
      const cid = data.cliente_id || reserva.cliente_id;
      for (const ac of data.acompanantes) {
        if (ac && ac.nombre && String(ac.nombre).trim().length > 0) {
          await ClienteRepository.addAcompanante(cid, {
            nombre: String(ac.nombre).trim(),
            documento: ac.documento ? String(ac.documento).trim() : null,
            parentesco: ac.parentesco
              ? String(ac.parentesco).trim()
              : 'Familiar',
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

    const reserva = await ReservationRepository.getById(id, {
      includeUser: false,
    });
    if (!reserva) {
      throw new NotFoundError('Reserva no encontrada.');
    }

    const esAdmin =
      esAdminFlag === true ||
      (typeof usuarioQueSolicita === 'object' &&
        usuarioQueSolicita.rol === 'ADMIN') ||
      (typeof usuarioQueSolicita === 'object' &&
        usuarioQueSolicita.rol === 'RECEPCION');
    const usuarioId =
      typeof usuarioQueSolicita === 'object'
        ? usuarioQueSolicita.id
        : usuarioQueSolicita;

    if (!esAdmin && reserva.usuario_id !== usuarioId) {
      throw new ForbiddenError('No tienes permiso para eliminar esta reserva.');
    }

    return await ReservationRepository.delete(id);
  }

  /**
   * Transición a Check-in: actualiza estado a 'CONFIRMADA', registra timestamp
   * y dispara el evento 'CHECK_IN_REALIZADO' en ReservationEventManager (Patrón Observer).
   */
  static async checkIn(id, usuarioQueSolicita, data = {}) {
    assertRequired(id, 'El id de la reserva es requerido');
    const reserva = await ReservationRepository.getById(id, {
      includeUser: false,
    });
    if (!reserva) {
      throw new NotFoundError('Reserva no encontrada.');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new ConflictError(
        'No se puede realizar check-in a una reserva cancelada.'
      );
    }
    if (reserva.estado === 'FINALIZADA') {
      throw new ConflictError(
        'No se puede realizar check-in a una reserva finalizada.'
      );
    }

    const now = new Date();
    const timestampStr = now.toISOString();
    const notaAdicional = data.observaciones ? ` - ${data.observaciones}` : '';
    const entradaCheckIn = `[Check-in: ${timestampStr}]${notaAdicional}`;
    const prevObs = reserva.observaciones_recepcion
      ? `${reserva.observaciones_recepcion}\n${entradaCheckIn}`
      : entradaCheckIn;

    const updateData = {
      estado: 'EN_CURSO',
      observaciones_recepcion: prevObs,
    };

    if (data.metodo_pago) {
      updateData.metodo_pago = String(data.metodo_pago).trim().toUpperCase();
    }
    if (data.anticipo !== undefined && data.anticipo !== null) {
      updateData.anticipo = Number(data.anticipo) || 0;
    }

    const validationTrace = [
      {
        order: 1,
        handler: 'CheckInTransitionValidation',
        step: 'Validación de Estado para Check-In',
        status: 'PASSED',
        message: `Check-in autorizado para reserva ${id.slice(0, 8)} (estado previo: ${
          reserva.estado
        } → EN_CURSO).`,
        details: {
          reserva_id: id,
          estado_previo: reserva.estado,
          estado_nuevo: 'EN_CURSO',
        },
        timestamp: timestampStr,
      },
    ];

    await ReservationRepository.update(id, updateData);

    // Registro de acompañantes en el check-in (Requerimiento Estricto Recepción)
    if (Array.isArray(data.acompanantes) && data.acompanantes.length > 0) {
      const cid = reserva.cliente_id || reserva.usuario_id;
      for (const ac of data.acompanantes) {
        if (ac && ac.nombre && String(ac.nombre).trim().length > 0) {
          await ClienteRepository.addAcompanante(cid, {
            nombre: String(ac.nombre).trim(),
            documento: ac.documento ? String(ac.documento).trim() : null,
            parentesco: ac.parentesco
              ? String(ac.parentesco).trim()
              : 'Familiar',
            telefono: ac.telefono ? String(ac.telefono).trim() : null,
            reserva_id: id,
          });
        }
      }
    }
    const reservaActualizada = await ReservationRepository.getById(id);

    const notificationTrace = await reservationEventManager.notify(
      'CHECK_IN_REALIZADO',
      reservaActualizada
    );

    return attachTracesToReservation(reservaActualizada, {
      validationTrace,
      notificationTrace,
    });
  }

  /**
   * Transición a Check-out: actualiza estado a 'FINALIZADA' y dispara el evento
   * 'CHECK_OUT_REALIZADO' en ReservationEventManager (Patrón Observer).
   */
  static async checkOut(id, usuarioQueSolicita, data = {}) {
    assertRequired(id, 'El id de la reserva es requerido');
    const reserva = await ReservationRepository.getById(id, {
      includeUser: false,
    });
    if (!reserva) {
      throw new NotFoundError('Reserva no encontrada.');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new ConflictError(
        'No se puede realizar check-out a una reserva cancelada.'
      );
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

    const validationTrace = [
      {
        order: 1,
        handler: 'CheckOutTransitionValidation',
        step: 'Validación de Estado para Check-Out',
        status: 'PASSED',
        message: `Check-out autorizado para reserva ${id.slice(0, 8)} (estado previo: ${
          reserva.estado
        } → FINALIZADA).`,
        details: {
          reserva_id: id,
          estado_previo: reserva.estado,
          estado_nuevo: 'FINALIZADA',
        },
        timestamp: timestampStr,
      },
    ];

    await ReservationRepository.update(id, {
      estado: 'FINALIZADA',
      observaciones_recepcion: prevObs,
    });

    const reservaActualizada = await ReservationRepository.getById(id);

    const notificationTrace = await reservationEventManager.notify(
      'CHECK_OUT_REALIZADO',
      reservaActualizada
    );

    return attachTracesToReservation(reservaActualizada, {
      validationTrace,
      notificationTrace,
    });
  }

  /**
   * Prórroga de estadía: marca es_prorroga: true y guarda nota de retraso/prórroga.
   */
  static async prorroga(id, usuarioQueSolicita, data = {}) {
    assertRequired(id, 'El id de la reserva es requerido');
    const reserva = await ReservationRepository.getById(id, {
      includeUser: false,
    });
    if (!reserva) {
      throw new NotFoundError('Reserva no encontrada.');
    }

    if (reserva.estado === 'CANCELADA' || reserva.estado === 'FINALIZADA') {
      throw new ConflictError(
        'No se puede prorrogar una reserva cancelada o finalizada.'
      );
    }

    const motivo =
      data.motivo ||
      data.observaciones ||
      'Retraso de salida acordado en recepción';
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
        throw new BadRequestError(
          'La nueva fecha de salida debe ser posterior a la fecha de inicio'
        );
      }
      const disponible = await ReservationRepository.checkAvailability(
        reserva.habitacion_id,
        fechaInicioActual,
        nuevaFechaFin,
        reserva.id
      );
      if (!disponible) {
        throw new ConflictError(
          'La habitación no se encuentra disponible hasta la nueva fecha solicitada.'
        );
      }
      updateData.fecha_fin = nuevaFechaFin;
    }

    await ReservationRepository.update(id, updateData);
    return await ReservationRepository.getById(id);
  }

  /**
   * Transición a No-Show: actualiza estado a 'CANCELADA' con nota 'No-Show sin preaviso'
   * y dispara el evento 'RESERVA_CANCELADA' en ReservationEventManager.
   */
  static async noShow(id, usuarioQueSolicita, data = {}) {
    assertRequired(id, 'El id de la reserva es requerido');
    const reserva = await ReservationRepository.getById(id, {
      includeUser: false,
    });
    if (!reserva) {
      throw new NotFoundError('Reserva no encontrada.');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new ConflictError('La reserva ya se encuentra cancelada.');
    }
    if (reserva.estado === 'FINALIZADA') {
      throw new ConflictError(
        'No se puede marcar como No-Show una reserva finalizada.'
      );
    }

    const now = new Date();
    const timestampStr = now.toISOString();
    const detalle = data.observaciones ? ` - ${data.observaciones}` : '';
    const entradaNoShow = `[No-Show sin preaviso: ${timestampStr}] Huésped no se presentó a tiempo${detalle}`;
    const prevObs = reserva.observaciones_recepcion
      ? `${reserva.observaciones_recepcion}\n${entradaNoShow}`
      : entradaNoShow;

    const validationTrace = [
      {
        order: 1,
        handler: 'NoShowCancellationValidation',
        step: 'Validación de Estado para Cancelación por No-Show',
        status: 'PASSED',
        message: `Reserva ${id.slice(0, 8)} marcada como CANCELADA por No-Show.`,
        details: {
          reserva_id: id,
          estado_previo: reserva.estado,
          estado_nuevo: 'CANCELADA',
        },
        timestamp: timestampStr,
      },
    ];

    await ReservationRepository.update(id, {
      estado: 'CANCELADA',
      observaciones_recepcion: prevObs,
    });

    const reservaCancelada = await ReservationRepository.getById(id);

    const notificationTrace = await reservationEventManager.notify(
      'RESERVA_CANCELADA',
      reservaCancelada
    );

    return attachTracesToReservation(reservaCancelada, {
      validationTrace,
      notificationTrace,
    });
  }

  /**
   * Consulta el estado actual de los observadores en ReservationEventManager.
   */
  static getObserversStatus() {
    const activeObservers = reservationEventManager.getActiveObservers();
    const allObservers = reservationEventManager.getAllObserversStatus();
    return {
      activeCount: activeObservers.length,
      totalRegistered: allObservers.length,
      activeObservers,
      observers: allObservers,
      auditHistory: AuditLogObserver.getHistory(25),
    };
  }

  /**
   * Suscribe o desuscribe un observador en caliente por su nombre.
   */
  static toggleObserver(observerName, explicitActive = undefined) {
    assertRequired(observerName, 'El nombre del observador (observerName) es requerido');
    try {
      return reservationEventManager.toggle(observerName, explicitActive);
    } catch (err) {
      throw new BadRequestError(err.message);
    }
  }

  /**
   * Obtiene la lista de IDs de habitaciones con reservas activas (PENDIENTE, CONFIRMADA, EN_CURSO)
   * en el período [fecha_inicio, fecha_fin).
   */
  static async getOccupiedRooms(query = {}) {
    const { fecha_inicio, fecha_fin, exclude_reservation_id } = query;
    assertRequired(fecha_inicio, 'La fecha de inicio es requerida');
    assertRequired(fecha_fin, 'La fecha de fin es requerida');

    const inicio = parseLocalDate(fecha_inicio);
    const fin = parseLocalDate(fecha_fin);
    if (inicio >= fin) {
      throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    return await ReservationRepository.getOccupiedRoomIds(inicio, fin, exclude_reservation_id || null);
  }

  /**
   * Consulta disponibilidad real de habitaciones en booking-service:
   * 1. Consulta habitaciones en room-service (descartando MANTENIMIENTO, etc.).
   * 2. Descarta habitaciones con reservas activas traslapadas (PENDIENTE, CONFIRMADA, EN_CURSO).
   * 3. Filtra por categoría ('SENCILLA', 'DOBLE', 'SUITE') si se solicita.
   */
  static async getAvailableRooms(query = {}) {
    const { fecha_inicio, fecha_fin, categoria, tipo } = query;
    assertRequired(fecha_inicio, 'La fecha de inicio es requerida');
    assertRequired(fecha_fin, 'La fecha de fin es requerida');

    const inicio = parseLocalDate(fecha_inicio);
    const fin = parseLocalDate(fecha_fin);
    if (inicio >= fin) {
      throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const catParam = categoria || tipo || null;
    let categoriaNormalizada = null;
    if (catParam) {
      categoriaNormalizada = String(catParam).trim().toUpperCase();
      const CATEGORIAS_VALIDAS = new Set(['SENCILLA', 'DOBLE', 'SUITE']);
      if (!CATEGORIAS_VALIDAS.has(categoriaNormalizada)) {
        throw new BadRequestError(
          `Categoría '${catParam}' no válida. Valores permitidos: ${[...CATEGORIAS_VALIDAS].join(', ')}`
        );
      }
    }

    const occupiedRoomIds = await ReservationRepository.getOccupiedRoomIds(inicio, fin);
    const allRooms = await getAllRooms().catch(() => []);

    const availableRooms = allRooms.filter((r) => {
      const est = String(r.estado || '').toUpperCase();
      if (est !== 'ACTIVA') return false; // Descarta MANTENIMIENTO, LIMPIEZA, ELIMINADA
      if (occupiedRoomIds.includes(r.id)) return false; // Descarta reservas activas
      if (categoriaNormalizada && String(r.tipo).toUpperCase() !== categoriaNormalizada) return false;
      return true;
    });

    return availableRooms;
  }
}

export default ReservationService;
