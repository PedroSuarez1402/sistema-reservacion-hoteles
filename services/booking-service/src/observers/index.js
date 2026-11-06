/**
 * ============================================================================
 * PATRN OBSERVER: MDULO DE EVENTOS Y OBSERVADORES DE RESERVA
 * ============================================================================
 * Proporciona un gestor centralizado de eventos y 4 observadores concretos:
 * 
 * 1. WhatsAppNotificationObserver: Enlaces y notificaciones a clientes/recepcin.
 * 2. RoomHousekeepingObserver: Estados de habitacin y rdenes de aseo/camarera.
 * 3. AuditLogObserver: Bitcora forense de auditora inmutable con checksum.
 * 4. MessageBrokerBridgeObserver: Puente al Message Broker central Pub/Sub.
 */

import ReservationEventManager from './ReservationEventManager.js';
import { IReservationObserver } from './IReservationObserver.js';
import { WhatsAppNotificationObserver } from './WhatsAppNotificationObserver.js';
import { RoomHousekeepingObserver } from './RoomHousekeepingObserver.js';
import { AuditLogObserver } from './AuditLogObserver.js';
import { MessageBrokerBridgeObserver } from './MessageBrokerBridgeObserver.js';

export {
  ReservationEventManager,
  IReservationObserver,
  WhatsAppNotificationObserver,
  RoomHousekeepingObserver,
  AuditLogObserver,
  MessageBrokerBridgeObserver,
};

/**
 * Fabrica una instancia de ReservationEventManager con los 4 observadores suscritos
 * a los eventos cannicos del ciclo de vida de la reserva.
 */
export function crearGestorEventosReserva(options = {}) {
  const eventManager = new ReservationEventManager();

  const waObserver = new WhatsAppNotificationObserver(options.whatsapp);
  const roomObserver = new RoomHousekeepingObserver(options.housekeeping);
  const auditObserver = new AuditLogObserver(options.audit);
  const brokerObserver = new MessageBrokerBridgeObserver(options.broker);

  const EVENTOS = ['RESERVA_CREADA', 'CHECK_IN_REALIZADO', 'CHECK_OUT_REALIZADO', 'RESERVA', 'CHECK_IN', 'CHECK_OUT'];

  eventManager.subscribeAll(EVENTOS, waObserver, 'WhatsAppNotificationObserver');
  eventManager.subscribeAll(EVENTOS, roomObserver, 'RoomHousekeepingObserver');
  eventManager.subscribeAll(EVENTOS, auditObserver, 'AuditLogObserver');
  eventManager.subscribeAll(EVENTOS, brokerObserver, 'MessageBrokerBridgeObserver');

  return {
    eventManager,
    observers: {
      waObserver,
      roomObserver,
      auditObserver,
      brokerObserver,
    },
  };
}

// Instancia global compartida por defecto (Singleton)
const defaultSetup = crearGestorEventosReserva();
export const defaultEventManager = defaultSetup.eventManager;
export const defaultObservers = defaultSetup.observers;

export default crearGestorEventosReserva;
