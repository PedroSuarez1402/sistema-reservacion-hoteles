// Cliente REST de comunicación BOOKING SERVICE → ROOM SERVICE (:4001)
// Arquitectura: Booking no conoce el modelo Room (desacoplamiento fuerte),
// así que consulta el catálogo por HTTP cuando necesita precio_noche o sincronizar estados.

import { signToken } from '../middlewares/auth.middleware.js';

const ROOM_SERVICE_URL = (process.env.ROOM_SERVICE_URL || 'http://localhost:4001/api').replace(/\/+$/, '');
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
    return await fetch(url, { ...(options || {}), signal: controller.signal });
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

/**
 * Consulta todas las habitaciones del catálogo en room-service con filtros opcionales.
 */
export async function getAllRooms(filters = {}) {
  let url = `${ROOM_SERVICE_URL}/rooms`;
  const params = new URLSearchParams();
  if (filters.tipo) params.append('tipo', filters.tipo);
  if (filters.categoria) params.append('categoria', filters.categoria);
  if (filters.estado) params.append('estado', filters.estado);
  const queryStr = params.toString();
  if (queryStr) url += `?${queryStr}`;

  let res;
  try {
    res = await requestWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, REQUEST_TIMEOUT_MS);
  } catch (err) {
    throw new RoomServiceUnavailableError(
      `No se pudo conectar con el catálogo de habitaciones en ${ROOM_SERVICE_URL}`,
      err
    );
  }

  if (!res.ok) {
    throw new RoomServiceUnavailableError(`Error consultando catálogo de habitaciones (HTTP ${res.status})`);
  }

  const payload = await res.json().catch(() => null);
  return payload?.data || [];
}

/**
 * Actualiza el estado operativo de una habitación en room-service (ej. 'ACTIVA', 'LIMPIEZA', 'MANTENIMIENTO').
 */
export async function updateRoomStatus(habitacionId, estado) {
  if (!habitacionId || !estado) return null;
  const url = `${ROOM_SERVICE_URL}/rooms/${encodeURIComponent(habitacionId)}/status`;
  const systemToken = signToken({
    id: 'system-housekeeping-observer',
    email: 'housekeeping.observer@hotel.local',
    rol: 'ADMIN',
  });

  let res;
  try {
    res = await requestWithTimeout(
      url,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${systemToken}`,
        },
        body: JSON.stringify({ estado }),
      },
      REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    throw new RoomServiceUnavailableError(
      `No se pudo sincronizar estado de habitación con room-service en ${ROOM_SERVICE_URL}`,
      err
    );
  }

  if (res.status === 404) {
    throw new RoomNotFoundError(habitacionId);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new RoomServiceUnavailableError(
      errBody?.message || `Error actualizando estado de habitación en room-service (HTTP ${res.status})`
    );
  }

  const payload = await res.json().catch(() => null);
  return payload?.data || null;
}

export default {
  getRoomById,
  getAllRooms,
  updateRoomStatus,
  RoomServiceUnavailableError,
  RoomNotFoundError,
};
