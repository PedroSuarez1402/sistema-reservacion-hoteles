/**
 * Patrón Observer - Observador Concreto #2: RoomHousekeepingObserver
 *
 * Responsabilidad:
 * - Sincronizar vía HTTP con `room-service` (:4001) el estado operativo de la habitación
 *   cuando ocurre un Check-in, Check-out o Cancelación de reserva:
 *   - `CHECK_IN_REALIZADO`  → Asegura que la habitación figure como `ACTIVA` (en ocupación).
 *   - `CHECK_OUT_REALIZADO` → Cambia el estado de la habitación a `LIMPIEZA` para Housekeeping.
 *   - `RESERVA_CANCELADA`   → Sincroniza la habitación a `ACTIVA` para liberarla inmediatamente.
 *   - `RESERVA_CREADA`      → Registra la asignación operativa de la habitación.
 */

import { updateRoomStatus, getRoomById } from '../../clients/room-client.js';

export class RoomHousekeepingObserver {
  constructor() {
    this.name = 'RoomHousekeepingObserver';
    this.description =
      'Sincroniza vía HTTP con room-service el estado físico y de limpieza de la habitación en Check-in, Check-out y Cancelación.';
  }

  /**
   * Determina el estado objetivo en `room-service` según el evento disparado.
   * @param {string} eventType
   * @returns {string|null}
   */
  resolveTargetRoomStatus(eventType) {
    switch (eventType) {
      case 'CHECK_IN_REALIZADO':
        return 'ACTIVA';
      case 'CHECK_OUT_REALIZADO':
        return 'LIMPIEZA';
      case 'RESERVA_CANCELADA':
        return 'ACTIVA';
      default:
        return null;
    }
  }

  /**
   * Reacciona al evento sincronizando el estado de la habitación en `room-service`.
   *
   * @param {string} eventType
   * @param {Object} reservationData
   */
  async update(eventType, reservationData) {
    const habitacionId = reservationData?.habitacion_id;
    const targetStatus = this.resolveTargetRoomStatus(eventType);

    if (!habitacionId) {
      return {
        status: 'SKIPPED',
        message: 'La reserva no contiene habitacion_id para sincronizar con room-service.',
        details: { eventType },
        timestamp: new Date().toISOString(),
      };
    }

    // Para RESERVA_CREADA verificamos estado en catálogo sin alterar a LIMPIEZA
    if (!targetStatus) {
      try {
        const room = await getRoomById(habitacionId);
        console.log(
          `🧹 [RoomHousekeepingObserver] Habitación ${
            room?.numero ? `#${room.numero}` : habitacionId
          } verificada para nueva reserva (${eventType}).`
        );
        return {
          status: 'NOTIFIED',
          message: `Habitación ${
            room?.numero ? `#${room.numero}` : habitacionId.slice(0, 8)
          } programada en calendario operativo (estado actual: ${room?.estado || 'ACTIVA'}).`,
          details: {
            habitacion_id: habitacionId,
            numero_habitacion: room?.numero || null,
            estado_habitacion: room?.estado || 'ACTIVA',
            accion: 'RESERVA_PROGRAMADA',
          },
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        return {
          status: 'WARNING',
          message: `Reserva registrada; room-service no disponible para consulta preventiva (${err?.message}).`,
          details: {
            habitacion_id: habitacionId,
            accion: 'RESERVA_PROGRAMADA_LOCAL',
            warning: err?.message,
          },
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Para CHECK_IN_REALIZADO, CHECK_OUT_REALIZADO y RESERVA_CANCELADA sincronizamos estado vía PATCH HTTP
    try {
      const updatedRoom = await updateRoomStatus(habitacionId, targetStatus);
      console.log(
        `🧹 [RoomHousekeepingObserver] Habitación ${
          updatedRoom?.numero ? `#${updatedRoom.numero}` : habitacionId
        } sincronizada en room-service → estado='${targetStatus}' tras ${eventType}.`
      );
      return {
        status: 'NOTIFIED',
        message: `Estado de habitación ${
          updatedRoom?.numero ? `#${updatedRoom.numero}` : habitacionId.slice(0, 8)
        } sincronizado a '${targetStatus}' en room-service tras ${eventType}.`,
        details: {
          habitacion_id: habitacionId,
          numero_habitacion: updatedRoom?.numero || null,
          nuevo_estado_habitacion: targetStatus,
          sincronizado_con_room_service: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(
        `⚠️  [RoomHousekeepingObserver] No se pudo sincronizar habitación ${habitacionId} a '${targetStatus}' en room-service: ${err?.message}`
      );
      return {
        status: 'WARNING',
        message: `Intento de sincronizar habitación a '${targetStatus}' registrado localmente (room-service no disponible: ${err?.message}).`,
        details: {
          habitacion_id: habitacionId,
          nuevo_estado_objetivo: targetStatus,
          sincronizado_con_room_service: false,
          warning: err?.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default RoomHousekeepingObserver;
