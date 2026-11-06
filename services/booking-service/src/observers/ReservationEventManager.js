/**
 * ============================================================================
 * PATRN OBSERVER: Sujeto Concreto (Subject / EventEmitter desacoplado)
 * ============================================================================
 * ReservationEventManager gestiona la lista de observadores suscritos a los
 * distintos eventos del ciclo de vida de una reserva (RESERVA_CREADA,
 * CHECK_IN_REALIZADO, CHECK_OUT_REALIZADO).
 * 
 * Permite suscribir y desuscribir en tiempo de ejecucin (Hot Unsubscribe),
 * demostrando el Principio Abierto/Cerrado (OCP).
 */

export class ReservationEventManager {
  #listeners = new Map(); // Map<eventName, Array<{ id: string, observer: Object }>>
  #registeredObservers = new Map(); // Map<id, Object>
  #eventHistory = [];

  constructor() {
    this.#listeners = new Map();
    this.#registeredObservers = new Map();
    this.#eventHistory = [];
  }

  /**
   * Suscribe un observador a un tipo de evento especfico.
   * @param {string} eventName - Nombre del evento (e.g. 'RESERVA_CREADA')
   * @param {Object} observer - Instancia con mtodo update(eventName, data)
   * @param {string} [observerId] - Identificador nico opcional
   */
  subscribe(eventName, observer, observerId = null) {
    if (!eventName || !observer) return;
    const id = observerId || observer.id || observer.name || observer.constructor.name;

    this.#registeredObservers.set(id, observer);

    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, []);
    }

    const currentList = this.#listeners.get(eventName);
    const existingIndex = currentList.findIndex((entry) => entry.id === id);

    if (existingIndex >= 0) {
      currentList[existingIndex] = { id, observer };
    } else {
      currentList.push({ id, observer });
    }
  }

  /**
   * Suscribe un observador a mltiples eventos a la vez.
   * @param {Array<string>} eventNames
   * @param {Object} observer
   * @param {string} [observerId]
   */
  subscribeAll(eventNames, observer, observerId = null) {
    for (const eventName of eventNames) {
      this.subscribe(eventName, observer, observerId);
    }
  }

  /**
   * Desuscribe en caliente un observador por su identificador.
   * @param {string} observerId - Nombre o ID del observador (e.g. 'WhatsAppNotificationObserver')
   * @param {string} [eventName] - Si se omite, se desuscribe de TODOS los eventos.
   * @returns {boolean} True si se removi al menos una suscripcin.
   */
  unsubscribe(observerId, eventName = null) {
    let removed = false;

    if (eventName) {
      if (this.#listeners.has(eventName)) {
        const list = this.#listeners.get(eventName);
        const filtered = list.filter((e) => e.id !== observerId);
        if (filtered.length !== list.length) {
          removed = true;
          this.#listeners.set(eventName, filtered);
        }
      }
    } else {
      for (const [evt, list] of this.#listeners.entries()) {
        const filtered = list.filter((e) => e.id !== observerId);
        if (filtered.length !== list.length) {
          removed = true;
          this.#listeners.set(evt, filtered);
        }
      }
    }

    return removed;
  }

  /**
   * Habilita o deshabilita en tiempo real un observador (toggle hot-swap).
   * @param {string} observerId
   * @param {boolean} enabled
   */
  setObserverStatus(observerId, enabled) {
    const observer = this.#registeredObservers.get(observerId);
    if (!observer) {
      // Buscar en listas
      for (const list of this.#listeners.values()) {
        const found = list.find(e => e.id === observerId);
        if (found) {
          if (typeof found.observer.setEnabled === 'function') {
            found.observer.setEnabled(enabled);
          } else {
            found.observer.enabled = Boolean(enabled);
          }
          return { id: observerId, enabled: Boolean(enabled) };
        }
      }
      throw new Error(`Observador '${observerId}' no encontrado.`);
    }

    if (typeof observer.setEnabled === 'function') {
      observer.setEnabled(enabled);
    } else {
      observer.enabled = Boolean(enabled);
    }
    return { id: observerId, enabled: Boolean(enabled) };
  }

  /**
   * Obtiene la lista unificada de observadores registrados y su estado.
   */
  getObservers() {
    const descriptions = {
      WhatsAppNotificationObserver: 'Genera enlaces directos wa.me y mensajes de bienvenida/confirmacin para huspedes y recepcin.',
      RoomHousekeepingObserver: 'Coordina rdenes de aseo, cambio de lencera y estados operativos de la habitacin (Housekeeping).',
      AuditLogObserver: 'Registra bitcora forense inmutable con timestamp y checksum de cada transicin de estado.',
      MessageBrokerBridgeObserver: 'Puente que publica asncronamente los eventos de dominio en el Message Broker central.',
    };

    const result = [];
    const seen = new Set();

    for (const [id, obs] of this.#registeredObservers.entries()) {
      seen.add(id);
      const isEnabled = typeof obs.isEnabled === 'function' ? obs.isEnabled() : (obs.enabled !== false);
      result.push({
        id,
        name: id,
        description: obs.description || descriptions[id] || 'Observador del ciclo de vida de reservaciones.',
        enabled: isEnabled,
      });
    }

    // Por si hay registrados slo en listeners
    for (const list of this.#listeners.values()) {
      for (const { id, observer } of list) {
        if (!seen.has(id)) {
          seen.add(id);
          const isEnabled = typeof observer.isEnabled === 'function' ? observer.isEnabled() : (observer.enabled !== false);
          result.push({
            id,
            name: id,
            description: observer.description || descriptions[id] || 'Observador de reservaciones.',
            enabled: isEnabled,
          });
        }
      }
    }

    return result;
  }

  /**
   * Notifica a todos los observadores registrados para el evento indicado.
   * @param {string} eventName
   * @param {Object} data - Payload del evento
   * @returns {Promise<Array<Object>>} Lista de ejecuciones de cada observador
   */
  async notify(eventName, data) {
    const list = this.#listeners.get(eventName) || [];
    const reportes = [];

    for (const { id, observer } of list) {
      try {
        const isEnabled = typeof observer.isEnabled === 'function' ? observer.isEnabled() : (observer.enabled !== false);

        if (!isEnabled) {
          reportes.push({
            id,
            observer: id,
            status: 'DISABLED',
            success: true,
            message: `Observador '${id}' omitido (desuscrito o inactivo en caliente).`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        if (typeof observer.update === 'function') {
          const resultado = await observer.update(eventName, data);
          reportes.push({
            id,
            observer: id,
            status: 'NOTIFIED',
            success: true,
            resultado,
            message: resultado?.message || `Notificacin procesada por ${id}.`,
            whatsappUrl: resultado?.whatsappUrl || null,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        reportes.push({
          id,
          observer: id,
          status: 'ERROR',
          success: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.#eventHistory.unshift({
      eventName,
      timestamp: new Date().toISOString(),
      reportesCount: reportes.length,
    });
    if (this.#eventHistory.length > 50) this.#eventHistory.pop();

    return reportes;
  }

  /**
   * Retorna los nombres de los observadores activos para un evento.
   */
  getSubscribers(eventName) {
    return (this.#listeners.get(eventName) || []).map((e) => e.id);
  }

  /**
   * Retorna una vista general de todas las suscripciones activas.
   */
  getAllSubscriptions() {
    const result = {};
    for (const [evt, list] of this.#listeners.entries()) {
      result[evt] = list.map((e) => e.id);
    }
    return result;
  }
}

export default ReservationEventManager;
