/**
 * Módulo del Patrón Observer (Observador) para Eventos de Reservación
 *
 * Instancia y suscribe por defecto los 4 observadores concretos:
 * 1. WhatsAppNotificationObserver
 * 2. RoomHousekeepingObserver
 * 3. AuditLogObserver
 * 4. MessageBrokerBridgeObserver
 */

import { ReservationEventManager } from './ReservationEventManager.js';
import { WhatsAppNotificationObserver } from './WhatsAppNotificationObserver.js';
import { RoomHousekeepingObserver } from './RoomHousekeepingObserver.js';
import { AuditLogObserver } from './AuditLogObserver.js';
import { MessageBrokerBridgeObserver } from './MessageBrokerBridgeObserver.js';

// Instancia Singleton del Subject (ReservationEventManager) con los 4 observadores activos al iniciar
export const reservationEventManager = new ReservationEventManager();

export const whatsAppNotificationObserver = new WhatsAppNotificationObserver();
export const roomHousekeepingObserver = new RoomHousekeepingObserver();
export const auditLogObserver = new AuditLogObserver();
export const messageBrokerBridgeObserver = new MessageBrokerBridgeObserver();

reservationEventManager.subscribe(whatsAppNotificationObserver);
reservationEventManager.subscribe(roomHousekeepingObserver);
reservationEventManager.subscribe(auditLogObserver);
reservationEventManager.subscribe(messageBrokerBridgeObserver);

export {
  ReservationEventManager,
  WhatsAppNotificationObserver,
  RoomHousekeepingObserver,
  AuditLogObserver,
  MessageBrokerBridgeObserver,
};

export default reservationEventManager;
