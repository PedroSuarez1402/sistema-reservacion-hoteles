/**
 * Patrón Chain of Responsibility (Refactoring.Guru) - Handler Base Abstracto
 *
 * Define la interfaz común para todos los eslabones de validación de reservaciones.
 * Permite encadenar dinámicamente manejadores mediante `setNext(handler)` y propagar
 * el contexto de validación a lo largo de la cadena con `async handle(context)`,
 * registrando cada paso ejecutado en `context.validationTrace`.
 */

export class ReservationValidationHandler {
  #nextHandler = null;

  constructor() {
    if (new.target === ReservationValidationHandler) {
      throw new Error(
        '[ChainOfResponsibility] ReservationValidationHandler es una clase abstracta y no puede instanciarse directamente.'
      );
    }
  }

  /**
   * Enlaza el siguiente manejador en la cadena de responsabilidad.
   * Retorna el manejador pasado por parámetro para permitir encadenamiento fluido:
   * `h1.setNext(h2).setNext(h3).setNext(h4)`
   *
   * @param {ReservationValidationHandler} handler
   * @returns {ReservationValidationHandler}
   */
  setNext(handler) {
    if (!(handler instanceof ReservationValidationHandler)) {
      throw new Error(
        '[ChainOfResponsibility] El siguiente eslabón debe heredar de ReservationValidationHandler.'
      );
    }
    this.#nextHandler = handler;
    return handler;
  }

  /**
   * Obtiene la referencia al siguiente eslabón de la cadena.
   * @returns {ReservationValidationHandler | null}
   */
  get nextHandler() {
    return this.#nextHandler;
  }

  /**
   * Registra la ejecución del eslabón actual en `context.validationTrace` y en consola.
   *
   * @param {Object} context - Contexto compartido a lo largo de la cadena
   * @param {Object} entry - Datos del paso ejecutado
   * @param {string} entry.handler - Nombre de la clase del eslabón
   * @param {string} entry.step - Nombre descriptivo del paso de validación
   * @param {'PASSED'|'FAILED'|'WARN'} [entry.status='PASSED'] - Resultado del eslabón
   * @param {string} entry.message - Detalle legible del resultado
   * @param {Object} [entry.details={}] - Metadatos adicionales para UI / auditoría
   */
  recordTrace(context, { handler, step, status = 'PASSED', message, details = {} }) {
    if (!Array.isArray(context.validationTrace)) {
      context.validationTrace = [];
    }

    const traceItem = {
      order: context.validationTrace.length + 1,
      handler: handler || this.constructor.name,
      step: step || this.constructor.name,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    context.validationTrace.push(traceItem);

    const icon = status === 'PASSED' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(
      `${icon} [ChainOfResponsibility][Paso #${traceItem.order} - ${traceItem.handler}] (${status}) ${message}`
    );

    return traceItem;
  }

  /**
   * Adjunta `context.validationTrace` al error antes de lanzarlo para que el cliente
   * o la UI puedan visualizar en qué eslabón exacto se detuvo la cadena.
   */
  failWithTrace(context, error, { step, message, details = {} }) {
    this.recordTrace(context, {
      handler: this.constructor.name,
      step,
      status: 'FAILED',
      message: message || error.message,
      details,
    });
    error.validationTrace = context.validationTrace;
    throw error;
  }

  /**
   * Procesa el contexto actual y, si no se interrumpe la cadena, delega al siguiente eslabón.
   *
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async handle(context) {
    if (!context || typeof context !== 'object') {
      throw new Error('[ChainOfResponsibility] Se requiere un objeto `context` válido.');
    }
    if (!Array.isArray(context.validationTrace)) {
      context.validationTrace = [];
    }

    if (this.#nextHandler) {
      return await this.#nextHandler.handle(context);
    }

    return context;
  }
}

export default ReservationValidationHandler;
