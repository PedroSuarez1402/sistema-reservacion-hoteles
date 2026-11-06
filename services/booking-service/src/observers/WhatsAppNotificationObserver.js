/**
 * OBSERVADOR 1: WhatsAppNotificationObserver
 * Responsabilidad: Generar y despachar los enlaces y mensajes de WhatsApp para el husped y recepcin.
 * Escucha: RESERVA_CREADA, CHECK_IN_REALIZADO, CHECK_OUT_REALIZADO (y sus variantes RESERVA, CHECK_IN, CHECK_OUT).
 */

export class WhatsAppNotificationObserver {
  constructor(options = {}) {
    this.id = 'WhatsAppNotificationObserver';
    this.phoneRecepcion = options.phoneRecepcion || '3183389453';
    this.enabled = true;
  }

  normalizeNumber(phone) {
    const raw = String(phone || this.phoneRecepcion).replace(/\D/g, '');
    return raw.length === 10 ? `57${raw}` : (raw || `57${this.phoneRecepcion}`);
  }

  setEnabled(status) {
    this.enabled = Boolean(status);
  }

  isEnabled() {
    return this.enabled;
  }

  async update(eventName, data) {
    const phone = this.normalizeNumber(data.cliente_telefono || data.telefono);
    const reservaId = data.id || data.codigoReserva || 'RSV-2026';
    const nombre = data.cliente_nombre || data.clienteNombre || 'Estimado Huésped';
    const numHab = data.habitacion_numero || data.habitacionNumero || data.habitacion_id || '101';
    const fInicio = data.fecha_inicio || data.fechaInicio || '2026-12-10';
    const fFin = data.fecha_fin || data.fechaFin || '2026-12-14';
    const totalFormateado = Number(data.precio_total || data.total || 0).toLocaleString();

    let mensaje = '';

    switch (eventName) {
      case 'RESERVA_CREADA':
      case 'RESERVA':
        mensaje = `🏨 *¡Reserva Confirmada!*\nHola ${nombre},\ntu reserva #${reservaId} para la Habitación #${numHab} está confirmada del ${fInicio} al ${fFin}.\nTotal: $${totalFormateado} COP.\n¡Te esperamos con entusiasmo en el hotel!`;
        break;

      case 'CHECK_IN_REALIZADO':
      case 'CHECK_IN':
        mensaje = `🔑 *¡Bienvenido al Hotel!*\nHola ${nombre},\nse ha registrado tu Check-In en la Habitación #${numHab}.\nClave WiFi: HotelVIP2026.\n¿Necesitas asistencia de recepción? Marca '9' desde tu habitación.`;
        break;

      case 'CHECK_OUT_REALIZADO':
      case 'CHECK_OUT':
        mensaje = `🌟 *¡Gracias por tu visita!*\nHola ${nombre},\ntu Check-Out de la Habitación #${numHab} ha finalizado con éxito.\nEsperamos que hayas disfrutado tu estadía. ¡Feliz viaje de regreso!`;
        break;

      default:
        mensaje = `Notificación de reserva #${reservaId} - Estado: ${eventName}`;
    }

    const encoded = encodeURIComponent(mensaje);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;

    const detalle = {
      observer: this.id,
      evento: eventName,
      telefonoDestino: phone,
      whatsappUrl: waUrl,
      mensajeTexto: mensaje,
      message: `Enlace directo de WhatsApp generado exitosamente para ${nombre} (${phone}).`,
      timestamp: new Date().toISOString(),
    };

    return detalle;
  }
}

export default WhatsAppNotificationObserver;
