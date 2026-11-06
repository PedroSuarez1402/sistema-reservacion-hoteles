import { ReservationValidationHandler } from './ReservationValidationHandler.js';

/**
 * Eslabn 3: Validacin de Capacidad Mxima de Huspedes
 * Verifica que el total de ocupantes (titular + acompaantes o nmero indicado)
 * respete el aforo legal y tcnico de la habitacin seleccionada.
 */
export class GuestCapacityValidationHandler extends ReservationValidationHandler {
  async validate(request, context) {
    const stepName = 'GuestCapacityValidationHandler (Aforo y Huspedes)';
    const numHuespedes = Number(request.numHuespedes || (request.acompanantes ? request.acompanantes.length + 1 : 1));
    const capacidadMaxima = Number(request.capacidadMaximaHabitacion || 3);

    if (numHuespedes <= 0) {
      return {
        step: stepName,
        passed: false,
        message: 'El nmero de huspedes debe ser al menos 1.',
        details: { numHuespedes },
      };
    }

    if (numHuespedes > capacidadMaxima) {
      return {
        step: stepName,
        passed: false,
        message: `Exceso de aforo: Se solicitaron ${numHuespedes} personas para una habitacin con capacidad mxima de ${capacidadMaxima}.`,
        details: { numHuespedes, capacidadMaxima, exceso: numHuespedes - capacidadMaxima },
      };
    }

    return {
      step: stepName,
      passed: true,
      message: `Aforo permitido: ${numHuespedes} husped(es) dentro del lmite de ${capacidadMaxima} de la suite/habitacin.`,
      details: { numHuespedes, capacidadMaxima },
    };
  }
}
