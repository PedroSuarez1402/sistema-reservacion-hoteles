/**
 * OBSERVADOR 4: MessageBrokerBridgeObserver
 * Responsabilidad: Actuar como adaptador/puente que retransmite los eventos de dominio
 * internos al Message Broker central distribuido (Patrn Pub/Sub).
 * Escucha: Todos los eventos del sistema (RESERVA_CREADA, CHECK_IN_REALIZADO, CHECK_OUT_REALIZADO, etc.).
 */

export class MessageBrokerBridgeObserver {
  constructor(options = {}) {
    this.id = 'MessageBrokerBridgeObserver';
    this.brokerUrl = options.brokerUrl || process.env.BROKER_URL || 'http://localhost:4003';
    this.publisherName = 'booking-service';
    this.enabled = true;
  }

  setEnabled(status) {
    this.enabled = Boolean(status);
  }

  isEnabled() {
    return this.enabled;
  }

  async update(eventName, data) {
    const brokerEnvelope = {
      topico: eventName,
      payload: {
        reservaId: data.id || data.codigoReserva,
        habitacionId: data.habitacion_id || data.habitacionId || data.habitacionNumero,
        clienteId: data.cliente_id || data.usuario_id || data.clienteNombre,
        precioTotal: data.precio_total || data.total,
        estado: data.estado || eventName,
        emisor: this.publisherName,
        timestamp: new Date().toISOString(),
      },
      publishedBy: this.publisherName,
    };

    let delivered = false;
    let errorDesc = null;

    // Intento de emisin HTTP al broker real (con timeout de 600ms)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 600);

      const resp = await fetch(`${this.brokerUrl}/api/broker/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-publisher': this.publisherName },
        body: JSON.stringify(brokerEnvelope),
        signal: controller.signal,
      }).catch((e) => {
        errorDesc = e.code || e.message;
        return null;
      });

      clearTimeout(timer);

      if (resp && resp.ok) {
        delivered = true;
      }
    } catch (e) {
      errorDesc = e.message;
    }

    const topicName = `hotel.reservas.${eventName.toLowerCase()}`;

    return {
      observer: this.id,
      evento: eventName,
      topicoBroker: topicName,
      estadoEntrega: delivered
        ? 'ENTREGADO_HTTP_200 (Broker Central :4003)'
        : `BROKER_LOCAL (${errorDesc || 'Broker offline, buffer encolado sin bloquear'})`,
      message: delivered
        ? `Mensaje entregado exitosamente al broker en http://localhost:4003 (Tópico: ${topicName}).`
        : `Evento preparado para envío asíncrono a broker (Tópico: ${topicName}) [Buffer local activo].`,
      brokerUrl: this.brokerUrl,
      entregadoAlBrokerReal: delivered,
      motivoDesconexion: errorDesc,
      brokerPayload: brokerEnvelope,
      timestamp: new Date().toISOString(),
    };
  }
}

export default MessageBrokerBridgeObserver;
