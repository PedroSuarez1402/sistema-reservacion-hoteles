'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import reservationService from '../../services/reservation.service';
import type {
  ApiErrorResponse,
  CreateReservationPayload,
  Reservation,
  ReservationStatus,
  UpdateReservationStatusPayload,
} from '../../types';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type UseAllReservationsOptions<TSelected = Reservation[]> = Omit<
  UseQueryOptions<
    Reservation[],
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.reservations)['lists']>
  >,
  'queryKey' | 'queryFn'
>;

export type UseMyReservationsOptions<TSelected = Reservation[]> = Omit<
  UseQueryOptions<
    Reservation[],
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.reservations)['myList']>
  >,
  'queryKey' | 'queryFn'
>;

export type UseReservationOptions<TSelected = Reservation | undefined> = Omit<
  UseQueryOptions<
    Reservation | undefined,
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.reservations)['detail']>
  >,
  'queryKey' | 'queryFn' | 'enabled'
> & { enabled?: boolean };

export type UseCreateReservationOptions = Omit<
  UseMutationOptions<
    Reservation,
    ApiErrorResponse,
    CreateReservationPayload,
    unknown
  >,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export type UseCancelReservationOptions = Omit<
  UseMutationOptions<
    Reservation,
    ApiErrorResponse,
    string,
    unknown
  >,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export type UseUpdateReservationStatusOptions = Omit<
  UseMutationOptions<
    Reservation,
    ApiErrorResponse,
    { id: string; payload: UpdateReservationStatusPayload },
    unknown
  >,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export type UseDeleteReservationOptions = Omit<
  UseMutationOptions<void, ApiErrorResponse, string, unknown>,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

const setReservationInList = (
  list: Reservation[] | undefined,
  id: string,
  updater: (r: Reservation) => Reservation
): Reservation[] | undefined => {
  if (!list) return list;
  return list.map((r) => (r.id === id ? updater(r) : r));
};

const removeReservationFromList = (
  list: Reservation[] | undefined,
  id: string
): Reservation[] | undefined => {
  if (!list) return list;
  return list.filter((r) => r.id !== id);
};

/**
 * Hook que obtiene TODAS las reservaciones (rol ADMIN / RECEPCION).
 *
 * @remarks
 * - **StaleTime**: 30 segundos. Estados pueden cambiar frecuentemente.
 * - **QueryKey**: `['reservations', 'list']`.
 */
export function useAllReservations<TSelected = Reservation[]>(
  options: UseAllReservationsOptions<TSelected> = {} as UseAllReservationsOptions<TSelected>
) {
  return useQuery({
    queryKey: queryKeys.reservations.lists(),
    queryFn: () => reservationService.getAll(),
    staleTime: STALE_TIMES.RESERVATIONS_LIST,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook que obtiene las reservaciones del usuario autenticado.
 *
 * @remarks
 * - **StaleTime**: 30 segundos.
 * - **QueryKey**: `['reservations', 'mine']`.
 */
export function useMyReservations<TSelected = Reservation[]>(
  options: UseMyReservationsOptions<TSelected> = {} as UseMyReservationsOptions<TSelected>
) {
  return useQuery({
    queryKey: queryKeys.reservations.myList(),
    queryFn: () => reservationService.getMyReservations(),
    staleTime: STALE_TIMES.RESERVATIONS_MINE,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook que obtiene el detalle de una reservación por ID.
 */
export function useReservation<TSelected = Reservation | undefined>(
  id: string,
  options: UseReservationOptions<TSelected> = {} as UseReservationOptions<TSelected>
) {
  const { enabled: userEnabled = true, ...rest } = options;
  const enabled = userEnabled && !!id;

  return useQuery({
    queryKey: queryKeys.reservations.detail(id),
    queryFn: async () => {
      if (!id) return undefined;
      return reservationService.getById(id);
    },
    staleTime: STALE_TIMES.RESERVATION_DETAIL,
    enabled,
    ...rest,
  });
}

/**
 * Hook de mutación para CREAR una reservación nueva.
 *
 * @remarks
 * - **Optimistic update**: se inserta la reserva temporal (estado `PENDIENTE`)
 *   en las listas `mine` y `all` antes de la respuesta del servidor.
 */
export function useCreateReservation(options: UseCreateReservationOptions = {}) {
  const queryClient = useQueryClient();
  const allKey = queryKeys.reservations.lists();
  const mineKey = queryKeys.reservations.myList();

  return useMutation({
    ...options,
    mutationKey: ['reservations', 'create'],
    mutationFn: (payload: CreateReservationPayload) =>
      reservationService.create(payload),
    onMutate: async (payload) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: allKey }),
        queryClient.cancelQueries({ queryKey: mineKey }),
      ]);
      const previousAll = queryClient.getQueryData<Reservation[]>(allKey);
      const previousMine = queryClient.getQueryData<Reservation[]>(mineKey);

      const tempId = `__temp_${Date.now()}`;
      const temp: Reservation = {
        id: tempId,
        usuario_id: '',
        habitacion_id: payload.habitacion_id,
        fecha_inicio: payload.fecha_inicio,
        fecha_fin: payload.fecha_fin,
        precio_total: 0,
        estado: 'PENDIENTE',
      };

      if (previousMine) {
        queryClient.setQueryData<Reservation[]>(mineKey, [temp, ...previousMine]);
      }
      if (previousAll) {
        queryClient.setQueryData<Reservation[]>(allKey, [temp, ...previousAll]);
      }

      return {
        previousAll,
        previousMine,
      } as {
        previousAll?: Reservation[];
        previousMine?: Reservation[];
      };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(data.id),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData<Reservation[]>(allKey, context.previousAll);
      }
      if (context?.previousMine) {
        queryClient.setQueryData<Reservation[]>(mineKey, context.previousMine);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
    },
  });
}

/**
 * Hook de mutación para CANCELAR una reservación.
 *
 * @remarks
 * - **Optimistic update**: establece `estado = 'CANCELADA'` en todas las
 *   listas y el detalle antes de recibir respuesta.
 */
export function useCancelReservation(options: UseCancelReservationOptions = {}) {
  const queryClient = useQueryClient();
  const allKey = queryKeys.reservations.lists();
  const mineKey = queryKeys.reservations.myList();

  return useMutation({
    ...options,
    mutationKey: ['reservations', 'cancel'],
    mutationFn: (id: string) => reservationService.cancel(id),
    onMutate: async (id) => {
      const detailKey = queryKeys.reservations.detail(id);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: allKey }),
        queryClient.cancelQueries({ queryKey: mineKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previousAll = queryClient.getQueryData<Reservation[]>(allKey);
      const previousMine = queryClient.getQueryData<Reservation[]>(mineKey);
      const previousDetail =
        queryClient.getQueryData<Reservation | undefined>(detailKey);

      const toCancel = (r: Reservation): Reservation =>
        ({ ...r, estado: 'CANCELADA' as ReservationStatus }) as Reservation;

      queryClient.setQueryData<Reservation[]>(
        allKey,
        setReservationInList(previousAll, id, toCancel)
      );
      queryClient.setQueryData<Reservation[]>(
        mineKey,
        setReservationInList(previousMine, id, toCancel)
      );
      if (previousDetail) {
        queryClient.setQueryData<Reservation>(detailKey, toCancel(previousDetail));
      }

      return {
        previousAll,
        previousMine,
        previousDetail,
      } as {
        previousAll?: Reservation[];
        previousMine?: Reservation[];
        previousDetail?: Reservation | undefined;
      };
    },
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(id),
      });
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
    onError: (_err, id, context) => {
      const detailKey = queryKeys.reservations.detail(id);
      if (context?.previousAll) {
        queryClient.setQueryData<Reservation[]>(allKey, context.previousAll);
      }
      if (context?.previousMine) {
        queryClient.setQueryData<Reservation[]>(mineKey, context.previousMine);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData<Reservation>(detailKey, context.previousDetail);
      } else {
        void queryClient.invalidateQueries({ queryKey: detailKey });
      }
    },
    onSettled: async (_data, _err, id) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(id),
      });
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
    },
  });
}

/**
 * Hook de mutación para CAMBIAR el `estado` de una reservación (staff).
 *
 * @remarks
 * - **Optimistic update**: actualiza el estado en listas y detalle inmediatamente.
 */
export function useUpdateReservationStatus(
  options: UseUpdateReservationStatusOptions = {}
) {
  const queryClient = useQueryClient();
  const allKey = queryKeys.reservations.lists();
  const mineKey = queryKeys.reservations.myList();

  return useMutation({
    ...options,
    mutationKey: ['reservations', 'updateStatus'],
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateReservationStatusPayload;
    }) => reservationService.updateStatus(id, payload),
    onMutate: async ({ id, payload }) => {
      const detailKey = queryKeys.reservations.detail(id);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: allKey }),
        queryClient.cancelQueries({ queryKey: mineKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previousAll = queryClient.getQueryData<Reservation[]>(allKey);
      const previousMine = queryClient.getQueryData<Reservation[]>(mineKey);
      const previousDetail =
        queryClient.getQueryData<Reservation | undefined>(detailKey);

      const applyStatus = (r: Reservation): Reservation =>
        ({ ...r, estado: payload.estado }) as Reservation;

      queryClient.setQueryData<Reservation[]>(
        allKey,
        setReservationInList(previousAll, id, applyStatus)
      );
      queryClient.setQueryData<Reservation[]>(
        mineKey,
        setReservationInList(previousMine, id, applyStatus)
      );
      if (previousDetail) {
        queryClient.setQueryData<Reservation>(detailKey, applyStatus(previousDetail));
      }

      return {
        previousAll,
        previousMine,
        previousDetail,
      } as {
        previousAll?: Reservation[];
        previousMine?: Reservation[];
        previousDetail?: Reservation | undefined;
      };
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(vars.id),
      });
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
    },
    onError: (_err, vars, context) => {
      const detailKey = queryKeys.reservations.detail(vars.id);
      if (context?.previousAll) {
        queryClient.setQueryData<Reservation[]>(allKey, context.previousAll);
      }
      if (context?.previousMine) {
        queryClient.setQueryData<Reservation[]>(mineKey, context.previousMine);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData<Reservation>(detailKey, context.previousDetail);
      } else {
        void queryClient.invalidateQueries({ queryKey: detailKey });
      }
    },
    onSettled: async (_data, _err, vars) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(vars.id),
      });
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
    },
  });
}

/**
 * Hook de mutación para ELIMINAR una reservación (solo staff).
 *
 * @remarks
 * - **Optimistic update**: elimina el item de las listas `mine` y `all` antes
 *   de la respuesta; restaura snapshot si falla.
 */
export function useDeleteReservation(options: UseDeleteReservationOptions = {}) {
  const queryClient = useQueryClient();
  const allKey = queryKeys.reservations.lists();
  const mineKey = queryKeys.reservations.myList();

  return useMutation({
    ...options,
    mutationKey: ['reservations', 'delete'],
    mutationFn: (id: string) => reservationService.remove(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: allKey }),
        queryClient.cancelQueries({ queryKey: mineKey }),
      ]);
      const previousAll = queryClient.getQueryData<Reservation[]>(allKey);
      const previousMine = queryClient.getQueryData<Reservation[]>(mineKey);

      queryClient.setQueryData<Reservation[]>(
        allKey,
        removeReservationFromList(previousAll, id)
      );
      queryClient.setQueryData<Reservation[]>(
        mineKey,
        removeReservationFromList(previousMine, id)
      );

      return {
        previousAll,
        previousMine,
      } as {
        previousAll?: Reservation[];
        previousMine?: Reservation[];
      };
    },
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(id),
      });
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
    onError: (_err, _id, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData<Reservation[]>(allKey, context.previousAll);
      }
      if (context?.previousMine) {
        queryClient.setQueryData<Reservation[]>(mineKey, context.previousMine);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: mineKey });
      await queryClient.invalidateQueries({ queryKey: allKey });
    },
  });
}
