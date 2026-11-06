/**
 * Patrón Observer - Observador Concreto #3: AuditLogObserver
 *
 * Responsabilidad:
 * - Registrar la trazabilidad detallada de cada evento de reservación con timestamp
 *   tanto en consola como en una bitácora de auditoría en memoria consultable vía API.
 */

const MAX_AUDIT_ENTRIES = 500;

export class AuditLogObserver {
  /** @type {Array<Object>} Bitácora histórica en memoria */
  static #auditHistory = [];

  constructor() {
    this.name = 'AuditLogObserver';
    this.description =
      'Registra la trazabilidad detallada de cada evento con timestamp en consola y en el historial de auditoría.';
  }

  /**
   * Obtiene el historial de auditoría registrado.
   * @param {number} [limit=100]
   */
  static getHistory(limit = 100) {
    const max = Math.max(1, Number(limit) || 100);
    return AuditLogObserver.#auditHistory.slice(0, max);
  }

  /**
   * Instancia helper para consultar el historial desde el observador.
   */
  getHistory(limit = 100) {
    return AuditLogObserver.getHistory(limit);
  }

  /**
   * Limpia el historial en memoria (útil para pruebas).
   */
  static clearHistory() {
    AuditLogObserver.#auditHistory = [];
  }

  /**
   * Reacciona al evento guardando un registro inmutable de auditoría.
   *
   * @param {string} eventType
   * @param {Object} reservationData
   */
  async update(eventType, reservationData) {
    const timestamp = new Date().toISOString();
    const auditId = `aud_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const entry = Object.freeze({
      auditId,
      timestamp,
      eventType,
      reservationId: reservationData?.id || null,
      habitacionId: reservationData?.habitacion_id || null,
      clienteId: reservationData?.cliente_id || null,
      clienteNombre:
        reservationData?.cliente?.nombre ||
        reservationData?.usuario?.nombre ||
        null,
      estadoReserva: reservationData?.estado || null,
      fechaInicio: reservationData?.fecha_inicio || null,
      fechaFin: reservationData?.fecha_fin || null,
      precioTotal:
        reservationData?.precio_total !== undefined
          ? Number(reservationData.precio_total)
          : null,
      metodoPago: reservationData?.metodo_pago || null,
    });

    AuditLogObserver.#auditHistory.unshift(entry);
    if (AuditLogObserver.#auditHistory.length > MAX_AUDIT_ENTRIES) {
      AuditLogObserver.#auditHistory.pop();
    }

    console.log(
      `📋 [AuditLogObserver][${timestamp}] auditId=${auditId} | evento=${eventType} | reserva=${
        entry.reservationId || '—'
      } | estado=${entry.estadoReserva || '—'} | total=$${
        entry.precioTotal !== null ? entry.precioTotal.toFixed(2) : '0.00'
      }`
    );

    return {
      status: 'NOTIFIED',
      message: `Evento '${eventType}' auditado con ID ${auditId} a las ${timestamp}.`,
      details: {
        ...entry,
        totalAuditRecordsInMemory: AuditLogObserver.#auditHistory.length,
      },
      timestamp,
    };
  }
}

export default AuditLogObserver;
