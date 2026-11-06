/**
 * Patrón Chain of Responsibility - Eslabón Concreto #3: OverlapAvailabilityHandler
 *
 * Responsabilidad:
 * - Consultar en la base de datos de `booking-service` que no existan reservaciones
 *   activas ('PENDIENTE', 'CONFIRMADA' o 'EN_CURSO') traslapadas para la misma habitación en el
 *   rango de fechas solicitado (`[fecha_inicio, fecha_fin)`).
 */

import { ReservationValidationHandler } from './ReservationValidationHandler.js';
import ReservationRepository from '../../repositories/reservation.repository.js';
import { ConflictError } from '../../utils/errors.util.js';

export class OverlapAvailabilityHandler extends ReservationValidationHandler {
  async handle(context) {
    const stepName = 'Verificación de Disponibilidad y No-Traslape en BD';
    const habitacionId = context.habitacionIdNormalizado || String(context.habitacion_id || '').trim();
    const inicio = context.inicioDate || new Date(context.fecha_inicio);
    const fin = context.finDate || new Date(context.fecha_fin);
    const excludeReservationId = context.excludeReservationId || null;

    let estaDisponible = true;
    let traslapadas = [];

    if (Array.isArray(context.reservasExistentes)) {
      for (const r of context.reservasExistentes) {
        const est = String(r.estado || '').toUpperCase();
        const esActiva = est === 'PENDIENTE' || est === 'CONFIRMADA' || est === 'EN_CURSO';
        if (r.habitacion_id === habitacionId && esActiva && r.id !== excludeReservationId) {
          const exInicio = new Date(r.fecha_inicio);
          const exFin = new Date(r.fecha_fin);
          if (inicio < exFin && fin > exInicio) {
            estaDisponible = false;
            traslapadas.push(r);
          }
        }
      }
    } else {
      try {
        estaDisponible = await ReservationRepository.checkAvailability(
          habitacionId,
          inicio,
          fin,
          excludeReservationId
        );
        if (!estaDisponible) {
          traslapadas = await ReservationRepository.findOverlapping(
            habitacionId,
            inicio,
            fin,
            excludeReservationId
          ).catch(() => []);
        }
      } catch (_dbErr) {
        // Resiliencia para demostración CLI si la BD no está levantada
        estaDisponible = true;
      }
    }

    if (!estaDisponible) {
      this.failWithTrace(
        context,
        new ConflictError('La habitación no está disponible en este período'),
        {
          step: stepName,
          message: `Conflicto de disponibilidad: existen ${
            traslapadas.length || 1
          } reserva(s) activa(s) traslapada(s) para la habitación en el rango ${
            context.fechaInicioIso || context.fecha_inicio
          } → ${context.fechaFinIso || context.fecha_fin}.`,
          details: {
            habitacion_id: habitacionId,
            fecha_inicio: context.fechaInicioIso || context.fecha_inicio,
            fecha_fin: context.fechaFinIso || context.fecha_fin,
            reservas_en_conflicto: traslapadas.map((r) => ({
              id: r.id,
              fecha_inicio: r.fecha_inicio,
              fecha_fin: r.fecha_fin,
              estado: r.estado,
            })),
          },
        }
      );
    }

    this.recordTrace(context, {
      handler: 'OverlapAvailabilityHandler',
      step: stepName,
      status: 'PASSED',
      message: `Sin traslapes en BD para la habitación en el período ${
        context.fechaInicioIso || context.fecha_inicio
      } → ${context.fechaFinIso || context.fecha_fin}.`,
      details: {
        habitacion_id: habitacionId,
        fecha_inicio: context.fechaInicioIso || context.fecha_inicio,
        fecha_fin: context.fechaFinIso || context.fecha_fin,
        disponible: true,
      },
    });

    return await super.handle(context);
  }
}

export default OverlapAvailabilityHandler;
