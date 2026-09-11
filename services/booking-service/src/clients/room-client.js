// Cliente REST de comunicación BOOKING SERVICE → ROOM SERVICE (:4001)
// Arquitectura: Booking no conoce el modelo Room (desacoplamiento fuerte),
// así que consulta el catálogo por HTTP cuando necesita precio_noche.

const ROOM_SERVICE_URL = process.env.ROOM_SERVICE_URL || 'http://localhost:4001/api';
const REQUEST_TIMEOUT_MS = Number(process.env.ROOM_SERVICE_TIMEOUT_MS || 5000);

export class RoomServiceUnavailableError extends Error {
  constructor(message, cause) {
    super(message || 'No se pudo consultar el servicio de habitaciones');
    this.name = 'RoomServiceUnavailableError';
    this.cause = cause;
  }
}

export class RoomNotFoundError extends Error {
  constructor(habitacionId) {
    super(`La habitación ${habitacionId} no existe en el catálogo`);
    this.name = 'RoomNotFoundError';
    this.habitacionId = habitacionId;
  }
}

async function requestWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...(options || {}), signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function getRoomById(habitacionId) {
  if (!habitacionId) return null;
  const url = `${ROOM_SERVICE_URL}/rooms/${encodeURIComponent(habitacionId)}`;
  let res;
  try {
    res = await requestWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, REQUEST_TIMEOUT_MS);
  } catch (err) {
    throw new RoomServiceUnavailableError(
      `No se pudo conectar con el servicio de habitaciones (timeout o sin conexión). Verifica que room-service esté levantado en ${ROOM_SERVICE_URL}`,
      err
    );
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new RoomServiceUnavailableError(
      `Error consultando habitación (HTTP ${res.status}). Intenta nuevamente en unos segundos.`
    );
  }
  let payload;
  try { payload = await res.json(); } catch (err) {
    throw new RoomServiceUnavailableError('Respuesta inválida del servicio de habitaciones', err);
  }
  if (!payload || payload.success === false || !payload.data) {
    return null;
  }
  return payload.data;
}

export default { getRoomById, RoomServiceUnavailableError, RoomNotFoundError };
