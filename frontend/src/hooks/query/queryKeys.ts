import type { RoomAvailabilityParams } from '../../types';

export const STALE_TIMES = {
  ROOMS_LIST: 2 * 60 * 1000,
  ROOMS_AVAILABLE: 30 * 1000,
  ROOM_DETAIL: 5 * 60 * 1000,
  RESERVATIONS_LIST: 30 * 1000,
  RESERVATIONS_MINE: 30 * 1000,
  RESERVATION_DETAIL: 1 * 60 * 1000,
  AUTH_ME: 5 * 60 * 1000,
} as const;

export const CACHE_TIMES = {
  DEFAULT: 10 * 60 * 1000,
} as const;

export const queryKeys = {
  rooms: {
    all: ['rooms'] as const,
    lists: () => [...queryKeys.rooms.all, 'list'] as const,
    available: (params: RoomAvailabilityParams) =>
      [...queryKeys.rooms.all, 'available', params] as const,
    detail: (id: string) => [...queryKeys.rooms.all, 'detail', id] as const,
  },
  reservations: {
    all: ['reservations'] as const,
    lists: () => [...queryKeys.reservations.all, 'list'] as const,
    myList: () => [...queryKeys.reservations.all, 'mine'] as const,
    detail: (id: string) => [...queryKeys.reservations.all, 'detail', id] as const,
  },
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
} as const;

export type QueryKeyFactory = typeof queryKeys;
