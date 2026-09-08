'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { ApiErrorResponse } from '../../types';
import roomService from '../../services/room.service';
import type {
  CreateRoomPayload,
  Room,
  RoomAvailabilityParams,
  RoomImage,
  UpdateRoomPayload,
} from '../../types';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type UseRoomsOptions<TSelected = Room[]> = Omit<
  UseQueryOptions<
    Room[],
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.rooms)['lists']>
  >,
  'queryKey' | 'queryFn'
>;

export type UseAvailableRoomsOptions<TSelected = Room[]> = Omit<
  UseQueryOptions<
    Room[],
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.rooms)['available']>
  >,
  'queryKey' | 'queryFn'
>;

export type UseRoomOptions<TSelected = Room | undefined> = Omit<
  UseQueryOptions<
    Room | undefined,
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.rooms)['detail']>
  >,
  'queryKey' | 'queryFn' | 'enabled'
> & { enabled?: boolean };

export type UseCreateRoomOptions = Omit<
  UseMutationOptions<Room, ApiErrorResponse, CreateRoomPayload, unknown>,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export type UseUpdateRoomOptions = Omit<
  UseMutationOptions<
    Room,
    ApiErrorResponse,
    { id: string; payload: UpdateRoomPayload },
    unknown
  >,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export type UseDeleteRoomOptions = Omit<
  UseMutationOptions<void, ApiErrorResponse, string, unknown>,
  'mutationFn' | 'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export type UseUploadRoomImagesOptions = Omit<
  UseMutationOptions<
    RoomImage[],
    ApiErrorResponse,
    {
      roomId: string;
      files: File[];
      onProgress?: (file: File, percent: number) => void;
    },
    unknown
  >,
  'mutationFn' | 'mutationKey'
>;

export type UseReorderRoomImagesOptions = Omit<
  UseMutationOptions<
    RoomImage[],
    ApiErrorResponse,
    { roomId: string; ids: string[] },
    { previousRoom?: Room }
  >,
  'mutationFn' | 'mutationKey' | 'onMutate'
>;

export type UseSetMainRoomImageOptions = Omit<
  UseMutationOptions<
    RoomImage[],
    ApiErrorResponse,
    { roomId: string; imageId: string },
    { previousRoom?: Room }
  >,
  'mutationFn' | 'mutationKey' | 'onMutate'
>;

export type UseDeleteRoomImageOptions = Omit<
  UseMutationOptions<
    void,
    ApiErrorResponse,
    { roomId: string; imageId: string },
    { previousRoom?: Room }
  >,
  'mutationFn' | 'mutationKey' | 'onMutate'
>;

/**
 * Hook que obtiene la lista completa de habitaciones.
 *
 * @remarks
 * - **StaleTime**: 2 minutos. Las habitaciones no cambian frecuentemente.
 * - **QueryKey**: `['rooms', 'list']`.
 * - Se invalida automáticamente tras cualquier mutación (create/update/delete).
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useRooms({
 *   onSuccess: (rooms) => console.log('Se cargaron', rooms.length, 'habitaciones'),
 * });
 * ```
 */
export function useRooms<TSelected = Room[]>(
  options: UseRoomsOptions<TSelected> = {} as UseRoomsOptions<TSelected>
) {
  return useQuery({
    queryKey: queryKeys.rooms.lists(),
    queryFn: () => roomService.getAll(),
    staleTime: STALE_TIMES.ROOMS_LIST,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook que obtiene las habitaciones disponibles en un rango de fechas.
 *
 * @remarks
 * - **StaleTime**: 30 segundos. La disponibilidad es volátil.
 * - La consulta se deshabilita automáticamente si `params` es `null` o
 *   alguna de las fechas está vacía.
 *
 * @param params - Parámetros `{ fecha_inicio, fecha_fin }` en formato ISO (`YYYY-MM-DD`)
 *                 o `null` para no consultar todavía.
 * @param options - Opciones de React Query (onSuccess / onError / select / etc.).
 */
export function useAvailableRooms<TSelected = Room[]>(
  params: RoomAvailabilityParams | null,
  options: UseAvailableRoomsOptions<TSelected> = {} as UseAvailableRoomsOptions<TSelected>
) {
  const enabled =
    (options.enabled ?? true) &&
    !!params &&
    params.fecha_inicio.length > 0 &&
    params.fecha_fin.length > 0;

  return useQuery({
    queryKey: queryKeys.rooms.available(
      params ?? { fecha_inicio: '', fecha_fin: '' }
    ),
    queryFn: () =>
      roomService.getAvailable({
        fecha_inicio: params!.fecha_inicio,
        fecha_fin: params!.fecha_fin,
      }),
    staleTime: STALE_TIMES.ROOMS_AVAILABLE,
    refetchOnReconnect: true,
    enabled,
    ...options,
  });
}

/**
 * Hook que obtiene el detalle de una habitación por su ID.
 *
 * @param id - UUID de la habitación. Si es cadena vacía la consulta no se ejecuta.
 * @param options - Opciones adicionales de React Query.
 */
export function useRoom<TSelected = Room | undefined>(
  id: string,
  options: UseRoomOptions<TSelected> = {} as UseRoomOptions<TSelected>
) {
  const { enabled: userEnabled = true, ...rest } = options;
  const enabled = userEnabled && !!id;

  return useQuery({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: async () => {
      if (!id) return undefined;
      return roomService.getById(id);
    },
    staleTime: STALE_TIMES.ROOM_DETAIL,
    enabled,
    ...rest,
  });
}

/**
 * Hook de mutación para CREAR una habitación nueva.
 *
 * @remarks
 * - **Optimistic update**: se añade la nueva habitación al final de la lista
 *   inmediatamente tras el submit; si la petición falla se deshace.
 * - Al terminar con éxito se invalida la lista completa.
 */
export function useCreateRoom(options: UseCreateRoomOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation({
    ...options,
    mutationKey: ['rooms', 'create'],
    mutationFn: (payload: CreateRoomPayload) => roomService.create(payload),
    onMutate: async (newRoom) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<Room[]>(listKey);
      if (previousList) {
        const optimistic: Room = {
          id: `__temp_${Date.now()}`,
          numero: newRoom.numero,
          tipo: newRoom.tipo,
          precio_noche: Number(newRoom.precio_noche),
          estado: 'ACTIVA',
        };
        queryClient.setQueryData<Room[]>(listKey, [...previousList, optimistic]);
      }
      return { previousList } as { previousList?: Room[] };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData<Room[]>(listKey, context.previousList);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

/**
 * Hook de mutación para ACTUALIZAR una habitación existente.
 *
 * @remarks
 * - **Optimistic update**: actualiza tanto la lista como el detalle en caché
 *   antes de la respuesta del servidor. Se deshace en caso de error.
 */
export function useUpdateRoom(options: UseUpdateRoomOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation({
    ...options,
    mutationKey: ['rooms', 'update'],
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoomPayload }) =>
      roomService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      const detailKey = queryKeys.rooms.detail(id);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previousList = queryClient.getQueryData<Room[]>(listKey);
      const previousDetail = queryClient.getQueryData<Room | undefined>(detailKey);

      if (previousList) {
        queryClient.setQueryData<Room[]>(
          listKey,
          previousList.map((r) =>
            r.id === id ? ({ ...r, ...payload } as Room) : r
          )
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<Room>(detailKey, {
          ...previousDetail,
          ...payload,
        });
      }

      return {
        previousList,
        previousDetail,
      } as { previousList?: Room[]; previousDetail?: Room };
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.id),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (_err, variables, context) => {
      const detailKey = queryKeys.rooms.detail(variables.id);
      if (context?.previousList) {
        queryClient.setQueryData<Room[]>(listKey, context.previousList);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData<Room>(detailKey, context.previousDetail);
      } else {
        void queryClient.invalidateQueries({ queryKey: detailKey });
      }
    },
    onSettled: async (_data, _err, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.id),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

/**
 * Hook de mutación para ELIMINAR una habitación.
 *
 * @remarks
 * - **Optimistic update**: elimina la habitación de la lista local antes de
 *   la respuesta; si falla se restaura el snapshot previo.
 */
export function useDeleteRoom(options: UseDeleteRoomOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation({
    ...options,
    mutationKey: ['rooms', 'delete'],
    mutationFn: (id: string) => roomService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<Room[]>(listKey);
      if (previousList) {
        queryClient.setQueryData<Room[]>(
          listKey,
          previousList.filter((r) => r.id !== id)
        );
      }
      return { previousList } as { previousList?: Room[] };
    },
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(id),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (_err, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData<Room[]>(listKey, context.previousList);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useUploadRoomImages(options: UseUploadRoomImagesOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation<
    RoomImage[],
    ApiErrorResponse,
    { roomId: string; files: File[]; onProgress?: (file: File, percent: number) => void },
    unknown
  >({
    ...options,
    mutationKey: ['rooms', 'uploadImages'],
    mutationFn: ({ roomId, files, onProgress }) =>
      roomService.uploadImages(roomId, files, onProgress),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onSettled: async (_data, _err, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useReorderRoomImages(options: UseReorderRoomImagesOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation<
    RoomImage[],
    ApiErrorResponse,
    { roomId: string; ids: string[] },
    { previousRoom?: Room }
  >({
    ...options,
    mutationKey: ['rooms', 'reorderImages'],
    mutationFn: ({ roomId, ids }) => roomService.reorderImages(roomId, ids),
    onMutate: async ({ roomId, ids }) => {
      const detailKey = queryKeys.rooms.detail(roomId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previousRoom = queryClient.getQueryData<Room | undefined>(detailKey);
      if (previousRoom?.imagenes) {
        const byId = new Map(previousRoom.imagenes.map((i) => [i.id, i]));
        const sorted: RoomImage[] = [];
        ids.forEach((id: string, idx: number) => {
          const img = byId.get(id);
          if (img) sorted.push({ ...img, orden: idx });
        });
        previousRoom.imagenes
          .filter((i) => !ids.includes(i.id))
          .forEach((img) => sorted.push({ ...img, orden: sorted.length }));
        queryClient.setQueryData<Room>(detailKey, {
          ...previousRoom,
          imagenes: sorted,
        });
      }
      return { previousRoom };
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (_err, variables, context) => {
      const detailKey = queryKeys.rooms.detail(variables.roomId);
      if (context?.previousRoom) {
        queryClient.setQueryData<Room>(detailKey, context.previousRoom);
      }
    },
    onSettled: async (_data, _err, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useSetMainRoomImage(options: UseSetMainRoomImageOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation<
    RoomImage[],
    ApiErrorResponse,
    { roomId: string; imageId: string },
    { previousRoom?: Room }
  >({
    ...options,
    mutationKey: ['rooms', 'setMainImage'],
    mutationFn: ({ roomId, imageId }) => roomService.setMainImage(roomId, imageId),
    onMutate: async ({ roomId, imageId }) => {
      const detailKey = queryKeys.rooms.detail(roomId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previousRoom = queryClient.getQueryData<Room | undefined>(detailKey);
      if (previousRoom?.imagenes) {
        const updated = previousRoom.imagenes.map((i) => ({
          ...i,
          es_principal: i.id === imageId,
        }));
        queryClient.setQueryData<Room>(detailKey, {
          ...previousRoom,
          imagenes: updated,
        });
      }
      return { previousRoom };
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (_err, variables, context) => {
      const detailKey = queryKeys.rooms.detail(variables.roomId);
      if (context?.previousRoom) {
        queryClient.setQueryData<Room>(detailKey, context.previousRoom);
      }
    },
    onSettled: async (_data, _err, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useDeleteRoomImage(options: UseDeleteRoomImageOptions = {}) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.rooms.lists();

  return useMutation<
    void,
    ApiErrorResponse,
    { roomId: string; imageId: string },
    { previousRoom?: Room }
  >({
    ...options,
    mutationKey: ['rooms', 'deleteImage'],
    mutationFn: ({ roomId, imageId }) => roomService.deleteImage(roomId, imageId),
    onMutate: async ({ roomId, imageId }) => {
      const detailKey = queryKeys.rooms.detail(roomId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previousRoom = queryClient.getQueryData<Room | undefined>(detailKey);
      if (previousRoom?.imagenes) {
        const removed = previousRoom.imagenes.find((i) => i.id === imageId);
        let newList = previousRoom.imagenes.filter((i) => i.id !== imageId);
        if (removed?.es_principal && newList.length > 0) {
          newList = newList.map((i, idx) => ({
            ...i,
            es_principal: idx === 0,
          }));
        }
        queryClient.setQueryData<Room>(detailKey, {
          ...previousRoom,
          imagenes: newList,
        });
      }
      return { previousRoom };
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (_err, variables, context) => {
      const detailKey = queryKeys.rooms.detail(variables.roomId);
      if (context?.previousRoom) {
        queryClient.setQueryData<Room>(detailKey, context.previousRoom);
      }
    },
    onSettled: async (_data, _err, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

