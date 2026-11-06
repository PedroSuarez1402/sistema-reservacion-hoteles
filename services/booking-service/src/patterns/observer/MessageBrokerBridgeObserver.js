/**
 * Patrón Observer - Observador Concreto #4: MessageBrokerBridgeObserver
 *
 * Responsabilidad:
 * - Actuar como puente (Bridge) entre el patrón Observer en memoria dentro de `booking-service`
 *   y el microservicio autónomo `message-broker` (Patrón Pub/Sub en el puerto 4003),
 *   enviando una petición HTTP POST al endpoint de publicación (`/api/broker/publish` / `/publish`).
 */

import { parseLocalDate } from '../chain/DateCoherenceHandler.js';

const BROKER_BASE_URL = (process.env.BROKER_URL || 'http://localhost:4003').replace(/\/+$/, '');
const BROKER_TIMEOUT_MS = Number(process.env.BROKER_TIMEOUT_MS || 4000);

export class MessageBrokerBridgeObserver {
  constructor() {
    this.name = 'MessageBrokerBridgeObserver';
    this.description =
      'Conecta el patrón Observer en memoria con el microservicio message-broker (puerto 4003) publicando el evento vía HTTP POST.';
  }

  /**
   * Construye el sobre de evento compatible con el Message Broker Pub/Sub.
   */
  buildBrokerEnvelope(eventType, reservationData) {
    const inicio = reservationData?.fecha_inicio
      ? parseLocalDate(reservationData.fecha_inicio)
      : null;
    const fin = reservationData?.fecha_fin
      ? parseLocalDate(reservationData.fecha_fin)
      : null;
    const noches =
      inicio && fin
        ? Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

    return {
      topico: eventType,
      payload: {
        id: reservationData?.id,
        cliente_id: reservationData?.cliente_id,
        cliente_nombre: reservationData?.cliente?.nombre || null,
        cliente_documento: reservationData?.cliente?.documento || null,
        acompanantes_count: Array.isArray(reservationData?.acompanantes)
          ? reservationData.acompanantes.length
          : 0,
        usuario_id: reservationData?.usuario_id || null,
        habitacion_id: reservationData?.habitacion_id,
        paquete_id: reservationData?.paquete_id || null,
        fecha_inicio: reservationData?.fecha_inicio,
        fecha_fin: reservationData?.fecha_fin,
        noches,
        precio_total: Number(reservationData?.precio_total || 0),
        estado: reservationData?.estado,
        evento_emitido_en: new Date().toISOString(),
      },
      publishedBy: 'booking-service',
    };
  }

  /**
   * Publica el evento en el `message-broker` (puerto 4003).
   *
   * @param {string} eventType
   * @param {Object} reservationData
   */
  async update(eventType, reservationData) {
    const envelope = this.buildBrokerEnvelope(eventType, reservationData);
    const publishUrl = BROKER_BASE_URL.endsWith('/api/broker')
      ? `${BROKER_BASE_URL}/publish`
      : `${BROKER_BASE_URL}/api/broker/publish`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BROKER_TIMEOUT_MS);

    try {
      const response = await fetch(publishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publisher': 'booking-service',
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        console.warn(
          `⚠️  [MessageBrokerBridgeObserver] Broker respondió HTTP ${response.status} al publicar '${eventType}'.`
        );
        return {
          status: 'WARNING',
          message: `El Message Broker respondió HTTP ${response.status} al publicar el tópico '${eventType}'.`,
          details: {
            brokerUrl: publishUrl,
            topico: eventType,
            httpStatus: response.status,
            brokerResponse: body,
          },
          timestamp: new Date().toISOString(),
        };
      }

      console.log(
        `📨 [MessageBrokerBridgeObserver] Evento '${eventType}' publicado en Message Broker (:4003) ✔ eventId=${
          body?.eventId || 'N/A'
        }`
      );

      return {
        status: 'NOTIFIED',
        message: `Evento '${eventType}' publicado en Message Broker (${publishUrl}) con ID ${
          body?.eventId || 'OK'
        }.`,
        details: {
          brokerUrl: publishUrl,
          endpoint: '/publish',
          topico: eventType,
          brokerEventId: body?.eventId || null,
          pendingSubscribers: body?.pendingSubscribers ?? 0,
          publishedBy: 'booking-service',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(
        `⚠️  [MessageBrokerBridgeObserver] Message Broker no disponible en ${publishUrl} al publicar '${eventType}': ${
          err?.message || err
        }`
      );
      return {
        status: 'WARNING',
        message: `Message Broker no disponible en ${publishUrl} (evento '${eventType}' registrado localmente sin bloquear la reserva).`,
        details: {
          brokerUrl: publishUrl,
          endpoint: '/publish',
          topico: eventType,
          brokerOnline: false,
          warning: err?.message || String(err),
        },
        timestamp: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export default MessageBrokerBridgeObserver;
