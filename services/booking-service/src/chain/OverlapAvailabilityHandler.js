import BaseHandler from './BaseHandler.js';

/**
 * ESLABÓN 3: OverlapAvailabilityHandler
 * Responsabilidad Única: Verificar la disponibilidad en calendario y detectar cruce de fechas (Overlapping).
 * Corta la cadena de inmediato si otra reservación activa ocupa la habitación en el rango solicitado.
 */
export class OverlapAvailabilityHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const { habitacion, habitacion_id, inicioDate, finDate, reservasExistentes, reservationRepository } = context;

    const hid = habitacion?.id || habitacion_id;
    const reqInicio = inicioDate || new Date(context.fecha_inicio);
    const reqFin = finDate || new Date(context.fecha_fin);

    let hayCruce = false;
    let reservaConflicto = null;

    if (Array.isArray(reservasExistentes)) {
      for (const r of reservasExistentes) {
        const estadoUpper = String(r.estado || '').toUpperCase();
        if (r.habitacion_id === hid && ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO'].includes(estadoUpper)) {
          const exInicio = new Date(r.fecha_inicio);
          const exFin = new Date(r.fecha_fin);
          if (reqInicio < exFin && reqFin > exInicio) {
            hayCruce = true;
            reservaConflicto = r;
            break;
          }
        }
      }
    } else if (reservationRepository && typeof reservationRepository.findOverlapping === 'function') {
      try {
        const solapadas = await reservationRepository.findOverlapping(hid, reqInicio, reqFin);
        if (solapadas && solapadas.length > 0) {
          hayCruce = true;
          reservaConflicto = solapadas[0];
        }
      } catch (_) {}
    }

    if (hayCruce) {
      const errorMsg = `Cruce de fechas (Overlap Conflict): La habitación #${habitacion?.numero || hid} ya se encuentra reservada en el rango del ${reservaConflicto.fecha_inicio} al ${reservaConflicto.fecha_fin} (Reserva #${reservaConflicto.id}).`;
      context.logs.push(`[CORTE] [OverlapAvailabilityHandler] ${errorMsg}`);
      context.trace.push({
        step: 'OverlapAvailabilityHandler',
        name: 'Disponibilidad y No-Traslape en Calendario',
        passed: false,
        message: errorMsg,
        details: { reservaConflicto },
      });
      return {
        success: false,
        handler: 'OverlapAvailabilityHandler',
        error: errorMsg,
        context,
      };
    }

    context.disponibilidadVerificada = true;
    const successMsg = 'Calendario libre: No existen cruces ni solapamientos de fechas en el período seleccionado.';
    context.logs.push(`[OK] [OverlapAvailabilityHandler] ${successMsg} Cadena continúa.`);
    context.trace.push({
      step: 'OverlapAvailabilityHandler',
      name: 'Disponibilidad y No-Traslape en Calendario',
      passed: true,
      message: successMsg,
    });

    return await super.handle(context);
  }
}

export default OverlapAvailabilityHandler;
