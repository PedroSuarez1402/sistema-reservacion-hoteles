/**
 * Patrón Observer - Observador Concreto #1: WhatsAppNotificationObserver
 *
 * Responsabilidad:
 * - Generar automáticamente el mensaje formateado y el enlace de WhatsApp (`https://wa.me/...`)
 *   para el huésped según el evento del ciclo de vida de la reserva:
 *   (`RESERVA_CREADA`, `CHECK_IN_REALIZADO`, `CHECK_OUT_REALIZADO`, `RESERVA_CANCELADA`).
 */

const DEFAULT_HOTEL_PHONE = process.env.RECEPTION_WHATSAPP || '3183389453';

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || DEFAULT_HOTEL_PHONE)
    .trim()
    .replace(/\D/g, '');
  if (digits.length === 10) {
    return `57${digits}`;
  }
  return digits || `57${DEFAULT_HOTEL_PHONE}`;
}

export class WhatsAppNotificationObserver {
  constructor() {
    this.name = 'WhatsAppNotificationObserver';
    this.description =
      'Genera el mensaje personalizado y el enlace directo de WhatsApp para el huésped en cada transición de la reserva.';
  }

  /**
   * Construye el texto del mensaje de WhatsApp según el tipo de evento.
   */
  buildMessage(eventType, reservationData) {
    const folio = String(reservationData?.id || '').slice(0, 8).toUpperCase() || 'N/A';
    const huesped =
      reservationData?.cliente?.nombre ||
      reservationData?.usuario?.nombre ||
      reservationData?.cliente_nombre ||
      'Estimado(a) Huésped';
    const fechaInicio = reservationData?.fecha_inicio || '—';
    const fechaFin = reservationData?.fecha_fin || '—';
    const total = Number(reservationData?.precio_total || 0).toFixed(2);
    const metodoPago = reservationData?.metodo_pago || 'EFECTIVO';
    const paqueteNombre = reservationData?.paquete?.nombre
      ? `\n🎁 Paquete incluido: ${reservationData.paquete.nombre}`
      : '';

    switch (eventType) {
      case 'RESERVA_CREADA':
        return (
          `🏨 *CONFIRMACIÓN DE RESERVA #${folio}*\n\n` +
          `¡Hola *${huesped}*! Tu reservación ha sido registrada exitosamente.\n` +
          `📅 Llegada (Check-in): ${fechaInicio}\n` +
          `📅 Salida (Check-out): ${fechaFin}\n` +
          `💳 Método de pago: ${metodoPago}\n` +
          `💰 Total estimado: $${total} USD` +
          paqueteNombre +
          `\n\n¡Te esperamos pronto en nuestro hotel!`
        );

      case 'CHECK_IN_REALIZADO':
        return (
          `🔑 *¡BIENVENIDO(A) A TU ESTADÍA! (Reserva #${folio})*\n\n` +
          `Hola *${huesped}*, tu Check-in se ha registrado correctamente.\n` +
          `📅 Fecha de salida programada: ${fechaFin}\n` +
          `🛎️ Si necesitas asistencia de recepción o servicio a la habitación, responde a este mensaje.\n\n` +
          `¡Deseamos que disfrutes de una excelente estancia!`
        );

      case 'CHECK_OUT_REALIZADO':
        return (
          `✨ *GRACIAS POR HOSPEDARTE CON NOSOTROS (Reserva #${folio})*\n\n` +
          `Hola *${huesped}*, hemos completado tu Check-out exitosamente.\n` +
          `💰 Total liquidado: $${total} USD\n` +
          `🌟 Fue un placer atenderte del ${fechaInicio} al ${fechaFin}. ¡Esperamos recibirte nuevamente muy pronto!`
        );

      case 'RESERVA_CANCELADA':
        return (
          `❌ *NOTIFICACIÓN DE CANCELACIÓN (Reserva #${folio})*\n\n` +
          `Hola *${huesped}*, te informamos que tu reservación programada del ${fechaInicio} al ${fechaFin} ha sido *CANCELADA*.\n` +
          `📞 Si deseas reprogramar tu visita o tienes alguna consulta, contáctanos por este medio.`
        );

      default:
        return (
          `🏨 *ACTUALIZACIÓN DE RESERVA #${folio}*\n\n` +
          `Hola *${huesped}*, el estado de tu reserva (${fechaInicio} → ${fechaFin}) se actualizó a *${reservationData?.estado || eventType}*.`
        );
    }
  }

  /**
   * Reacciona al evento generando el mensaje y enlace `wa.me` para el huésped.
   *
   * @param {string} eventType
   * @param {Object} reservationData
   */
  async update(eventType, reservationData) {
    const rawGuestPhone =
      reservationData?.cliente?.telefono ||
      reservationData?.cliente_datos?.telefono ||
      DEFAULT_HOTEL_PHONE;
    const normalizedPhone = normalizePhone(rawGuestPhone);
    const formattedMessage = this.buildMessage(eventType, reservationData);
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      formattedMessage
    )}`;

    console.log(
      `💬 [WhatsAppNotificationObserver] Enlace generado para '${eventType}' (Tel: +${normalizedPhone}) → ${whatsappUrl.slice(
        0,
        75
      )}...`
    );

    return {
      status: 'NOTIFIED',
      message: `Notificación de WhatsApp preparada para ${
        reservationData?.cliente?.nombre || 'huésped'
      } (+${normalizedPhone}) por evento ${eventType}.`,
      details: {
        eventType,
        recipientName:
          reservationData?.cliente?.nombre ||
          reservationData?.usuario?.nombre ||
          'Huésped',
        phone: normalizedPhone,
        formattedMessage,
        whatsappUrl,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export default WhatsAppNotificationObserver;
