// Cliente REST ROOM SERVICE → BOOKING SERVICE (:4002)
// Permite a Room Service consultar las habitaciones ocupadas con reservas activas (PENDIENTE, CONFIRMADA, EN_CURSO)
// para calcular la disponibilidad real del hotel sin acoplar modelos de base de datos.

const BOOKING_SERVICE_URL = (process.env.BOOKING_SERVICE_URL || 'http://localhost:4002').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = Number(process.env.BOOKING_SERVICE_TIMEOUT_MS || 4000);

async function requestWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta en booking-service los IDs de habitaciones que tienen reservas activas
 * en el rango [fechaInicio, fechaFin).
 * @param {string|Date} fechaInicio 
 * @param {string|Date} fechaFin 
 * @returns {Promise<string[]>} Array de UUIDs de habitaciones ocupadas
 */
export async function getOccupiedRoomIds(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return [];

  const startStr = typeof fechaInicio === 'string' ? fechaInicio : fechaInicio.toISOString().slice(0, 10);
  const endStr = typeof fechaFin === 'string' ? fechaFin : fechaFin.toISOString().slice(0, 10);

  const url = `${BOOKING_SERVICE_URL}/api/reservations/occupied-rooms?fecha_inicio=${encodeURIComponent(startStr)}&fecha_fin=${encodeURIComponent(endStr)}`;

  try {
    const res = await requestWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.warn(`[BookingClient] Advertencia al consultar habitaciones ocupadas (HTTP ${res.status}).`);
      return [];
    }

    const payload = await res.json().catch(() => null);
    if (payload && payload.success && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  } catch (err) {
    // Si booking-service no está disponible (ej. arranque en frío o standalone), registra advertencia no fatal
    console.warn(
      `[BookingClient] No se pudo consultar reservas en ${BOOKING_SERVICE_URL} (${err && err.message ? err.message : err}).`
    );
    return [];
  }
}

export default {
  getOccupiedRoomIds,
};
