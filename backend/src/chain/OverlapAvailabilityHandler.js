import BaseHandler from './BaseHandler.js';

/**
 * ESLABN 3: OverlapAvailabilityHandler
 * Responsabilidad nica: Verificar la disponibilidad en calendario y detectar cruce de fechas (Overlapping).
 * Corta la cadena de inmediato si otra reservacin activa ocupa la habitacin en el rango solicitado.
 */
export class OverlapAvailabilityHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const { habitacion, habitacion_id, habitacionId, inicioDate, finDate, reservasExistentes, reservationRepository } = context;

    const hid = habitacion?.id || habitacion_id || habitacionId;
    const reqInicio = inicioDate || new Date(context.fecha_inicio || context.fechaInicio);
    const reqFin = finDate || new Date(context.fecha_fin || context.fechaFin);

    // Consulta en BD o en lista en memoria
    let hayCruce = false;
    let reservaConflicto = null;

    if (reservationRepository && typeof reservationRepository.findOverlapping === 'function') {
      try {
        const solapadas = await reservationRepository.findOverlapping(hid, reqInicio, reqFin);
        if (solapadas && solapadas.length > 0) {
          hayCruce = true;
          reservaConflicto = solapadas[0];
        }
      } catch (_) {
        // Modo resiliente sin BD
      }
    }

    if (!hayCruce && Array.isArray(reservasExistentes)) {
      for (const r of reservasExistentes) {
        if (r.habitacion_id === hid && r.estado !== 'CANCELADA') {
          const exInicio = new Date(r.fecha_inicio);
          const exFin = new Date(r.fecha_fin);
          // Condicin cannica de solapamiento de intervalos semiabiertos:
          // [reqInicio, reqFin) solapa con [exInicio, exFin) si reqInicio < exFin && reqFin > exInicio
          if (reqInicio < exFin && reqFin > exInicio) {
            hayCruce = true;
            reservaConflicto = r;
            break;
          }
        }
      }
    }

    if (hayCruce) {
      const errorMsg = `Cruce de fechas (Overlap Conflict): La habitacin #${habitacion?.numero || hid} ya se encuentra reservada en el rango del ${reservaConflicto.fecha_inicio} al ${reservaConflicto.fecha_fin} (Reserva #${reservaConflicto.id}).`;
      context.logs.push(`? [OverlapAvailabilityHandler] Corte de cadena: ${errorMsg}`);
      context.trace.push({
        step: 'OverlapAvailabilityHandler',
        name: 'Disponibilidad de Calendario (Sin Solapamientos)',
        passed: false,
        message: errorMsg,
        details: { conflicto: reservaConflicto },
      });
      return {
        success: false,
        handler: 'OverlapAvailabilityHandler',
        error: errorMsg,
        context,
      };
    }

    context.disponibilidadVerificada = true;
    const passMsg = `Calendario libre: No existen cruces ni solapamientos de fechas en el perodo seleccionado.`;
    context.logs.push(`? [OverlapAvailabilityHandler] ${passMsg} Cadena contina.`);
    context.trace.push({
      step: 'OverlapAvailabilityHandler',
      name: 'Disponibilidad de Calendario (Sin Solapamientos)',
      passed: true,
      message: passMsg,
      details: { fechaInicio: reqInicio.toISOString().split('T')[0], fechaFin: reqFin.toISOString().split('T')[0] },
    });

    return await super.handle(context);
  }
}

export default OverlapAvailabilityHandler;
