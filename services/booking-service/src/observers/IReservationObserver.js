/**
 * Interfaz / Clase Base Abstracta para Observadores de Reservacin
 * Define el contrato que todo observador debe cumplir para suscribirse a ReservationEventManager.
 */
export class IReservationObserver {
  /**
   * @param {string} name Identificador nico del observador
   * @param {string} description Propsito del observador
   * @param {boolean} enabled Estado activo/inactivo inicial
   */
  constructor(name, description = '', enabled = true) {
    if (new.target === IReservationObserver) {
      throw new Error('IReservationObserver es una clase abstracta y no puede instanciarse directamente.');
    }
    this.name = name;
    this.description = description;
    this.enabled = enabled;
  }

  /**
   * Mtodo de reaccin invocado cuando el Subject emite un evento.
   * @param {string} eventType Tipo de evento ('RESERVA_CREADA', 'CHECK_IN', 'CHECK_OUT', etc.)
   * @param {Object} data Carga til del evento
   * @returns {Promise<Object>} Resultado y trazabilidad de la notificacin
   */
  async update(eventType, data) {
    throw new Error('El mtodo update() debe ser implementado por el observador concreto.');
  }

  setEnabled(status) {
    this.enabled = Boolean(status);
  }

  isEnabled() {
    return this.enabled;
  }

  getInfo() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
    };
  }
}
