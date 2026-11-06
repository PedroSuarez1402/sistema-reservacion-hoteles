import { ReservationValidationHandler } from './ReservationValidationHandler.js';

/**
 * Eslabn 1: Validacin de Fechas y Estada
 * Verifica que las fechas sean coherentes, no estn en el pasado
 * y cumplan con la estada mnima (mnimo 1 noche).
 */
export class DateRangeValidationHandler extends ReservationValidationHandler {
  async validate(request, context) {
    const stepName = 'DateRangeValidationHandler (Fechas y Estada)';
    const { fechaInicio, fechaFin } = request;

    if (!fechaInicio || !fechaFin) {
      return {
        step: stepName,
        passed: false,
        message: 'Las fechas de check-in (fechaInicio) y check-out (fechaFin) son obligatorias.',
        details: { fechaInicio, fechaFin },
      };
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return {
        step: stepName,
        passed: false,
        message: 'Formato de fecha invlido. Debe ser YYYY-MM-DD o formato ISO vlido.',
        details: { fechaInicio, fechaFin },
      };
    }

    if (fin <= inicio) {
      return {
        step: stepName,
        passed: false,
        message: 'La fecha de salida debe ser posterior a la fecha de entrada.',
        details: { fechaInicio, fechaFin },
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioNormalizado = new Date(inicio);
    inicioNormalizado.setHours(0, 0, 0, 0);

    // Permite reservas desde hoy en adelante
    if (inicioNormalizado < hoy && !request.isHistoricalSimulation) {
      return {
        step: stepName,
        passed: false,
        message: 'No es posible crear una reservacin con fecha de inicio en el pasado.',
        details: { fechaInicio, fechaActual: hoy.toISOString().split('T')[0] },
      };
    }

    const diffMs = fin.getTime() - inicio.getTime();
    const noches = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (noches > 60) {
      return {
        step: stepName,
        passed: false,
        message: 'Estada mxima superada (lmite 60 noches por reservacin continua).',
        details: { noches, limiteMaximo: 60 },
      };
    }

    return {
      step: stepName,
      passed: true,
      message: `Rango de fechas vlido: ${noches} ${noches === 1 ? 'noche' : 'noches'} de alojamiento.`,
      details: { fechaInicio, fechaFin, noches },
    };
  }
}
