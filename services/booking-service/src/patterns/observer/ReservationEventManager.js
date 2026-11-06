/**
 * Patrón Observer (Refactoring.Guru) - Subject / Publisher (ReservationEventManager)
 *
 * Mantiene una lista dinámica de observadores suscritos en memoria y les notifica
 * automáticamente cualquier cambio de ciclo de vida en una reservación:
 * - RESERVA_CREADA
 * - CHECK_IN_REALIZADO
 * - CHECK_OUT_REALIZADO
 * - RESERVA_CANCELADA
 *
 * Permite suscribir y desuscribir observadores en caliente (runtime) y devuelve
 * un `notificationTrace` detallado por cada evento disparado.
 */

export class ReservationEventManager {
  /** @type {Map<string, Object>} Observadores actualmente activos */
  #subscribers = new Map();

  /** @type {Map<string, Object>} Catálogo de instancias conocidas para re-suscripción en caliente */
  #catalog = new Map();

  /**
   * Registra un observador en el catálogo interno sin activarlo necesariamente.
   * @param {Object} observer
   */
  registerInCatalog(observer) {
    if (!observer || !observer.name || typeof observer.update !== 'function') {
      throw new Error(
        '[ReservationEventManager] El observador debe poseer una propiedad `name` y un método `async update(eventType, reservationData)`.'
      );
    }
    const key = String(observer.name).trim();
    this.#catalog.set(key, observer);
    return this;
  }

  /**
   * Suscribe un observador para recibir notificaciones de eventos de reserva.
   * Soporta recibir la instancia del observador o su nombre si ya está en el catálogo.
   *
   * @param {Object|string} observerOrName
   * @returns {boolean} true si quedó suscrito
   */
  subscribe(observerOrName) {
    let observer = observerOrName;
    if (typeof observerOrName === 'string') {
      observer = this.#catalog.get(observerOrName.trim());
      if (!observer) {
        for (const [k, v] of this.#catalog.entries()) {
          if (k.toLowerCase() === observerOrName.trim().toLowerCase()) {
            observer = v;
            break;
          }
        }
      }
      if (!observer) {
        throw new Error(
          `[ReservationEventManager] No se encontró un observador registrado con el nombre '${observerOrName}'.`
        );
      }
    }

    if (!observer || !observer.name || typeof observer.update !== 'function') {
      throw new Error(
        '[ReservationEventManager] El observador debe poseer una propiedad `name` y un método `async update(eventType, reservationData)`.'
      );
    }

    const key = String(observer.name).trim();
    this.#catalog.set(key, observer);
    this.#subscribers.set(key, observer);

    console.log(`🔔 [Observer] '${key}' SUSCRITO en ReservationEventManager.`);
    return true;
  }

  /**
   * Desuscribe un observador activo por su nombre (`name`).
   *
   * @param {string|Object} observerName
   * @returns {boolean} true si estaba activo y fue desuscrito
   */
  unsubscribe(observerName) {
    const rawName =
      typeof observerName === 'object' && observerName !== null
        ? observerName.name
        : observerName;
    const target = String(rawName || '').trim();
    if (!target) return false;

    let actualKey = this.#subscribers.has(target) ? target : null;
    if (!actualKey) {
      for (const k of this.#subscribers.keys()) {
        if (k.toLowerCase() === target.toLowerCase()) {
          actualKey = k;
          break;
        }
      }
    }

    if (!actualKey) return false;

    const removed = this.#subscribers.delete(actualKey);
    if (removed) {
      console.log(`🔕 [Observer] '${actualKey}' DESUSCRITO de ReservationEventManager.`);
    }
    return removed;
  }

  /**
   * Retorna la lista de observadores actualmente activos.
   * @returns {Array<{ name: string, description: string, active: boolean }>}
   */
  getActiveObservers() {
    return Array.from(this.#subscribers.values()).map((obs) => ({
      name: obs.name,
      description: obs.description || `Observador ${obs.name}`,
      active: true,
    }));
  }

  /**
   * Retorna el estado completo de todos los observadores conocidos (activos e inactivos).
   * @returns {Array<{ name: string, description: string, active: boolean }>}
   */
  getAllObserversStatus() {
    return Array.from(this.#catalog.values()).map((obs) => ({
      name: obs.name,
      description: obs.description || `Observador ${obs.name}`,
      active: this.#subscribers.has(obs.name),
    }));
  }

  /**
   * Obtiene una instancia de observador del catálogo por su nombre.
   * @param {string} name
   */
  getObserver(name) {
    const target = String(name || '').trim();
    if (this.#catalog.has(target)) return this.#catalog.get(target);
    for (const [k, v] of this.#catalog.entries()) {
      if (k.toLowerCase() === target.toLowerCase()) return v;
    }
    return null;
  }

  /**
   * Alterna (subscribe / unsubscribe) un observador en caliente por su nombre.
   *
   * @param {string} observerName
   * @param {boolean} [explicitActive] - Si se especifica booleano, fuerza ese estado; si no, invierte el actual.
   */
  toggle(observerName, explicitActive = undefined) {
    const obs = this.getObserver(observerName);
    if (!obs) {
      const available = Array.from(this.#catalog.keys()).join(', ');
      const err = new Error(
        `El observador '${observerName}' no existe. Observadores disponibles: ${available}`
      );
      err.statusCode = 400;
      throw err;
    }

    const currentlyActive = this.#subscribers.has(obs.name);
    const shouldBeActive =
      typeof explicitActive === 'boolean' ? explicitActive : !currentlyActive;

    if (shouldBeActive) {
      this.subscribe(obs);
    } else {
      this.unsubscribe(obs.name);
    }

    return {
      observer: obs.name,
      previousState: currentlyActive,
      active: this.#subscribers.has(obs.name),
      action: this.#subscribers.has(obs.name) ? 'SUBSCRIBED' : 'UNSUBSCRIBED',
      activeObservers: this.getActiveObservers(),
      allObservers: this.getAllObserversStatus(),
    };
  }

  /**
   * Notifica a todos los observadores suscritos sobre un evento de reservación.
   * Devuelve el array `notificationTrace` detallando la reacción de cada observador.
   *
   * @param {string} eventType - Ej: 'RESERVA_CREADA', 'CHECK_IN_REALIZADO', 'CHECK_OUT_REALIZADO', 'RESERVA_CANCELADA'
   * @param {Object} reservationData - Instancia de Sequelize o JSON de la reservación
   * @returns {Promise<Array<Object>>} notificationTrace
   */
  async notify(eventType, reservationData) {
    const normalizedEvent = String(eventType || 'EVENTO_RESERVA')
      .trim()
      .toUpperCase();
    const plainReservation =
      reservationData && typeof reservationData.toJSON === 'function'
        ? reservationData.toJSON()
        : { ...(reservationData || {}) };

    const notificationTrace = [];
    const activeList = Array.from(this.#subscribers.values());

    console.log(
      `\n📣 [ReservationEventManager] Disparando evento '${normalizedEvent}' para reserva ${
        plainReservation.id || '(sin-id)'
      } → ${activeList.length} observador(es) activo(s).`
    );

    let order = 0;
    for (const observer of activeList) {
      order += 1;
      const startedAt = new Date().toISOString();
      try {
        const result = await observer.update(normalizedEvent, plainReservation);
        const traceEntry = {
          order,
          observer: observer.name,
          eventType: normalizedEvent,
          status: result?.status || 'NOTIFIED',
          message:
            result?.message ||
            `Observador ${observer.name} procesó el evento ${normalizedEvent} exitosamente.`,
          details: result?.details ?? result ?? {},
          timestamp: result?.timestamp || new Date().toISOString(),
        };
        notificationTrace.push(traceEntry);
      } catch (err) {
        console.warn(
          `⚠️  [ReservationEventManager] Error en observador '${observer.name}' procesando '${normalizedEvent}': ${
            err?.message || err
          }`
        );
        notificationTrace.push({
          order,
          observer: observer.name,
          eventType: normalizedEvent,
          status: 'ERROR',
          message: `Error ejecutando ${observer.name}: ${err?.message || String(err)}`,
          details: { error: err?.message || String(err) },
          timestamp: startedAt,
        });
      }
    }

    return notificationTrace;
  }
}

export default ReservationEventManager;
