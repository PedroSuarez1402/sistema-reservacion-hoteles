/**
 * Patrón Chain of Responsibility - Eslabón Concreto #2: RoomStatusAndCapacityHandler
 *
 * Responsabilidad:
 * - Validar que `habitacion_id` sea un UUID válido.
 * - Consultar la habitación en `room-service` (o en `context.room` si fue inyectada).
 * - Verificar que la habitación exista y que su estado operativo NO sea 'MANTENIMIENTO' (ni 'ELIMINADA').
 * - Verificar que la capacidad máxima de la habitación (según su categoría Flyweight)
 *   soporte al huésped titular + los acompañantes declarados.
 */

import { ReservationValidationHandler } from './ReservationValidationHandler.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors.util.js';
import {
  getRoomById,
  RoomServiceUnavailableError,
} from '../../clients/room-client.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAPACIDAD_POR_TIPO = {
  SENCILLA: 1,
  DOBLE: 2,
  SUITE: 4,
};

export class RoomStatusAndCapacityHandler extends ReservationValidationHandler {
  async handle(context) {
    const stepName = 'Verificación de Estado y Capacidad de Habitación';
    const { habitacion_id, acompanantes = [] } = context;

    if (!habitacion_id) {
      this.failWithTrace(context, new BadRequestError('La habitación es requerida'), {
        step: stepName,
        message: 'No se proporcionó habitacion_id.',
      });
    }

    const hid = String(habitacion_id).trim();
    if (!UUID_REGEX.test(hid)) {
      this.failWithTrace(
        context,
        new BadRequestError('El ID de habitación debe ser un UUID válido'),
        {
          step: stepName,
          message: `El habitacion_id '${hid}' no tiene un formato UUID válido.`,
          details: { habitacion_id: hid },
        }
      );
    }

    context.habitacionIdNormalizado = hid;

    // Contabilizar acompañantes válidos + 1 titular
    const acompanantesValidos = Array.isArray(acompanantes)
      ? acompanantes.filter((a) => a && a.nombre && String(a.nombre).trim().length > 0)
      : [];
    const totalHuespedes = 1 + acompanantesValidos.length;
    context.totalHuespedes = totalHuespedes;

    let room = context.room || null;
    let roomServiceOffline = false;

    if (!room) {
      try {
        room = await getRoomById(hid);
      } catch (err) {
        if (err instanceof RoomServiceUnavailableError) {
          roomServiceOffline = true;
        } else {
          throw err;
        }
      }
    }

    // Si room-service respondió y la habitación no existe en catálogo -> 404
    if (!roomServiceOffline && !room) {
      this.failWithTrace(
        context,
        new NotFoundError(`La habitación (${hid}) no existe en el catálogo`),
        {
          step: stepName,
          message: `La habitación ${hid} no fue encontrada en room-service.`,
          details: { habitacion_id: hid },
        }
      );
    }

    if (room) {
      context.room = room;
      context.precioNocheHabitacion = Number(room.precio_noche) || 0;

      const estadoHabitacion = String(room.estado || 'ACTIVA').trim().toUpperCase();
      if (estadoHabitacion === 'MANTENIMIENTO') {
        this.failWithTrace(
          context,
          new ConflictError(
            `La habitación #${room.numero || hid} se encuentra en MANTENIMIENTO y no puede ser reservada`
          ),
          {
            step: stepName,
            message: `Habitación #${room.numero || hid} rechazada por estar en estado MANTENIMIENTO.`,
            details: {
              habitacion_id: hid,
              numero: room.numero,
              estado: estadoHabitacion,
            },
          }
        );
      }

      if (estadoHabitacion === 'ELIMINADA') {
        this.failWithTrace(
          context,
          new ConflictError(
            `La habitación #${room.numero || hid} no se encuentra habilitada para reservaciones`
          ),
          {
            step: stepName,
            message: `Habitación #${room.numero || hid} está marcada como ELIMINADA.`,
            details: {
              habitacion_id: hid,
              numero: room.numero,
              estado: estadoHabitacion,
            },
          }
        );
      }

      const tipoHabitacion = String(room.tipo || 'DOBLE').trim().toUpperCase();
      const capacidadMaxima = Number(
        room.especificaciones_tipo?.capacidad_maxima ??
          room.capacidad_maxima ??
          CAPACIDAD_POR_TIPO[tipoHabitacion] ??
          4
      );

      if (totalHuespedes > capacidadMaxima) {
        this.failWithTrace(
          context,
          new BadRequestError(
            `La capacidad máxima de la habitación #${room.numero || hid} (${tipoHabitacion}) es de ${capacidadMaxima} persona(s), pero se intentan registrar ${totalHuespedes} (titular + ${acompanantesValidos.length} acompañante(s))`
          ),
          {
            step: stepName,
            message: `Capacidad excedida en habitación #${room.numero || hid} (${tipoHabitacion}): ${totalHuespedes}/${capacidadMaxima} huéspedes.`,
            details: {
              habitacion_id: hid,
              numero: room.numero,
              tipo: tipoHabitacion,
              capacidad_maxima: capacidadMaxima,
              huespedes_solicitados: totalHuespedes,
              acompanantes_count: acompanantesValidos.length,
            },
          }
        );
      }

      this.recordTrace(context, {
        handler: 'RoomStatusAndCapacityHandler',
        step: stepName,
        status: 'PASSED',
        message: `Habitación #${room.numero || hid.slice(0, 8)} (${tipoHabitacion}) con estado '${estadoHabitacion}' y capacidad suficiente (${totalHuespedes}/${capacidadMaxima} pax).`,
        details: {
          habitacion_id: hid,
          numero: room.numero,
          tipo: tipoHabitacion,
          estado: estadoHabitacion,
          capacidad_maxima: capacidadMaxima,
          ocupacion_solicitada: totalHuespedes,
          precio_noche: context.precioNocheHabitacion,
        },
      });
    } else {
      // Modo resiliente cuando room-service no está levantado pero se valida formato y límite general
      const capacidadFallback = 4;
      if (totalHuespedes > capacidadFallback) {
        this.failWithTrace(
          context,
          new BadRequestError(
            `La cantidad de huéspedes (${totalHuespedes}) excede la capacidad máxima permitida (${capacidadFallback})`
          ),
          {
            step: stepName,
            message: `Capacidad máxima excedida (${totalHuespedes}/${capacidadFallback}).`,
            details: {
              habitacion_id: hid,
              huespedes_solicitados: totalHuespedes,
              capacidad_maxima: capacidadFallback,
            },
          }
        );
      }

      this.recordTrace(context, {
        handler: 'RoomStatusAndCapacityHandler',
        step: stepName,
        status: 'PASSED',
        message: `UUID de habitación válido y ocupación dentro del límite (${totalHuespedes}/${capacidadFallback} pax) [room-service offline: validación local aplicada].`,
        details: {
          habitacion_id: hid,
          ocupacion_solicitada: totalHuespedes,
          capacidad_maxima: capacidadFallback,
          room_service_mode: 'OFFLINE_FALLBACK',
        },
      });
    }

    return await super.handle(context);
  }
}

export default RoomStatusAndCapacityHandler;
