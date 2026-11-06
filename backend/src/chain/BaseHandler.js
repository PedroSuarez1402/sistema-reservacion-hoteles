/**
 * Patrón Chain of Responsibility (Cadena de Responsabilidad)
 * Manejador Base abstracto / plantilla para la cadena de validación de reservas.
 */

export class BaseHandler {
  #nextHandler = null;

  /**
   * Enlaza el siguiente eslabón en la cadena.
   * Retorna el siguiente manejador para permitir encadenamiento fluido:
   * h1.setNext(h2).setNext(h3).setNext(h4);
   */
  setNext(handler) {
    this.#nextHandler = handler;
    return handler;
  }

  /**
   * Procesa la solicitud en el eslabón actual o delega al siguiente.
   * @param {Object} context - Objeto de contexto acumulativo de la reserva.
   * @returns {Promise<Object>} Resultado de la validación { success, error, handler, context }
   */
  async handle(context) {
    if (this.#nextHandler) {
      return await this.#nextHandler.handle(context);
    }
    // Fin de la cadena alcanzado con éxito
    return {
      success: true,
      error: null,
      context,
    };
  }
}

export default BaseHandler;
