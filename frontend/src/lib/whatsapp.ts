import { formatCurrency, formatDate, roomTypeLabels } from './utils';
import type { Room, Paquete } from '../types';

export const DEFAULT_RECEPTION_WHATSAPP = '3183389453';

/**
 * Normaliza el número de teléfono para la URL de WhatsApp (formato internacional sin '+' ni espacios).
 * Si tiene 10 dígitos (formato estándar de Colombia), le antepone el prefijo internacional '57'.
 */
export function normalizeWhatsAppNumber(rawPhone?: string): string {
  const phone = (rawPhone || process.env.NEXT_PUBLIC_RECEPTION_WHATSAPP || DEFAULT_RECEPTION_WHATSAPP).trim();
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `57${digits}`;
  }
  return digits || `57${DEFAULT_RECEPTION_WHATSAPP}`;
}

/**
 * Genera la URL universal de WhatsApp (https://wa.me/...) con mensaje codificado.
 */
export function buildWhatsAppUrl(message: string, rawPhone?: string): string {
  const number = normalizeWhatsAppNumber(rawPhone);
  const encodedText = encodeURIComponent(message.trim());
  return `https://wa.me/${number}?text=${encodedText}`;
}

/**
 * Construye el mensaje prellenado para consultar o reservar una habitación específica.
 */
export function buildRoomWhatsAppMessage(
  room: Pick<Room, 'numero' | 'tipo' | 'precio_noche'>,
  dates?: { fecha_inicio?: string; fecha_fin?: string }
): string {
  const tipoLabel = roomTypeLabels[room.tipo] || room.tipo;
  const precioFormatted = formatCurrency(Number(room.precio_noche));

  let fechasInfo = '';
  if (dates?.fecha_inicio && dates?.fecha_fin) {
    fechasInfo = `📅 Fechas solicitadas: Del ${formatDate(dates.fecha_inicio)} al ${formatDate(dates.fecha_fin)}\n`;
  }

  return (
    `¡Hola Recepción! Vengo de la página web del hotel y me interesa reservar:\n\n` +
    `Habitación: N° ${room.numero} (${tipoLabel})\n` +
    `Tarifa base: ${precioFormatted} / noche\n` +
    fechasInfo +
    `\n¿Tienen disponibilidad y cómo podemos coordinar la reserva? ¡Muchas gracias!`
  );
}

/**
 * Construye el mensaje prellenado para consultar un paquete turístico.
 */
export function buildPackageWhatsAppMessage(paquete: Pick<Paquete, 'nombre' | 'descuento_porcentaje' | 'descripcion'>): string {
  const desc = Number(paquete.descuento_porcentaje) || 0;
  const descuentoTexto = desc > 0 ? ` (Descuento del ${desc}%)` : '';

  return (
    `¡Hola Recepción! Vengo de la página web del hotel y me gustaría consultar información sobre el siguiente paquete:\n\n` +
    `Paquete Turístico: ${paquete.nombre}${descuentoTexto}\n` +
    (paquete.descripcion ? `Detalle: ${paquete.descripcion}\n` : '') +
    `\n¿Podrían darme información de precios, servicios incluidos y disponibilidad? ¡Gracias!`
  );
}

/**
 * Mensaje predeterminado de bienvenida y consulta general.
 */
export function buildGeneralWhatsAppMessage(): string {
  return (
    `¡Hola Recepción! Vengo de la página web del hotel.\n\n` +
    `Me gustaría consultar disponibilidad de habitaciones, paquetes turísticos y tarifas para una próxima estadía. ¡Muchas gracias!`
  );
}
