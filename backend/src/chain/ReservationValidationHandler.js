/**
 * Base Abstract Handler - Patrn Chain of Responsibility
 * Permite encadenar verificadores independientes para la validacin
 * de reservaciones antes de su construccin y persistencia.
 */

export class ReservationValidationHandler {
  #nextHandler = null;

  /**
   * Configura el siguiente eslabn en la cadena.
   * @param {ReservationValidationHandler} handler
   * @returns {ReservationValidationHandler} El siguiente handler para encadenamiento fluido.
   */
  setNext(handler) {
    this.#nextHandler = handler;
    return handler;
  }

  /**
   * Procesa la solicitud a travs de este eslabn y propaga al siguiente si es exitoso.
   * @param {Object} request Datos de la reservacin/accin.
   * @param {Object} context Contexto acumulado con traces y metadata.
   * @returns {Promise<Object>} Resultado global de la validacin con validationTrace.
   */
  async handle(request, context = { trace: [], passed: true }) {
    const stepResult = await this.validate(request, context);
    context.trace.push(stepResult);

    if (!stepResult.passed) {
      context.passed = false;
      context.failedAt = stepResult.step;
      context.failureReason = stepResult.message;
      return context;
    }

    if (this.#nextHandler) {
      return await this.#nextHandler.handle(request, context);
    }

    return context;
  }

  /**
   * Mtodo abstracto a ser implementado por cada eslabn concreto.
   * @param {Object} request
   * @param {Object} context
   * @returns {Promise<{ step: string, passed: boolean, message: string, details?: any }>}
   */
  async validate(request, context) {
    throw new Error('El mtodo validate() debe ser implementado por la subclase concreta.');
  }
}
