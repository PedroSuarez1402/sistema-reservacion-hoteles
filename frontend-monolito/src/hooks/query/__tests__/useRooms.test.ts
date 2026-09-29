import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import roomService from '../../../services/room.service';
import type { Room } from '../../../types';
import {
  useRooms,
  useAvailableRooms,
  useRoom,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
} from '../useRooms';
import {
  createTestQueryClient,
  renderHookWithClient,
} from '../../../test/react-query-wrapper';
import { queryKeys } from '../queryKeys';

vi.mock('../../../services/room.service');

const mockRooms: Room[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    numero: '101',
    tipo: 'SENCILLA',
    precio_noche: 45,
    estado: 'ACTIVA',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    numero: '201',
    tipo: 'DOBLE',
    precio_noche: 75,
    estado: 'ACTIVA',
  },
];

const mockedRoomService = vi.mocked(roomService);

describe('hooks/query/useRooms', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRoomService.getAll.mockResolvedValue([...mockRooms]);
    mockedRoomService.getById.mockImplementation(async (id) => {
      return mockRooms.find((r) => r.id === id) ?? Promise.reject(new Error('not found'));
    });
    mockedRoomService.getAvailable.mockResolvedValue([mockRooms[0]!]);
    mockedRoomService.create.mockImplementation(async (p) => ({
      id: 'new',
      numero: p.numero,
      tipo: p.tipo,
      precio_noche: Number(p.precio_noche),
      estado: 'ACTIVA',
    }));
    mockedRoomService.update.mockImplementation(async (id, payload) => {
      const existing = mockRooms.find((r) => r.id === id);
      if (!existing) throw new Error('not found');
      return { ...existing, ...payload } as Room;
    });
    mockedRoomService.remove.mockResolvedValue(undefined);
  });

  describe('useRooms', () => {
    it('expone los estados nativos de React Query', async () => {
      const { result } = renderHookWithClient(() => useRooms());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetched).toBe(false);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.isStale).toBe('boolean');
      expect(typeof result.current.fetchStatus).toBe('string');
      expect(typeof result.current.dataUpdatedAt).toBe('number');
    });

    it('usa la query key correcta para caché', async () => {
      const qc = createTestQueryClient();
      const { result } = renderHookWithClient(() => useRooms(), {
        queryClient: qc,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const cached = qc.getQueryData(queryKeys.rooms.lists());
      expect(cached).toBeDefined();
      expect(cached).toHaveLength(2);
    });

    it('respeta la opción `select` personalizada del consumidor', async () => {
      const { result } = renderHookWithClient(() =>
        useRooms({
          select: (rooms) => rooms.map((r) => r.numero),
        })
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(['101', '201']);
    });
  });

  describe('useAvailableRooms', () => {
    it('se deshabilita cuando params es null', () => {
      const { result } = renderHookWithClient(() => useAvailableRooms(null));
      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(mockedRoomService.getAvailable).not.toHaveBeenCalled();
    });

    it('consulta cuando params tiene fechas', async () => {
      const params = { fecha_inicio: '2026-10-01', fecha_fin: '2026-10-03' };
      const { result } = renderHookWithClient(() => useAvailableRooms(params));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedRoomService.getAvailable).toHaveBeenCalledWith(params);
    });
  });

  describe('useRoom', () => {
    it('devuelve el detalle de una habitación', async () => {
      const { result } = renderHookWithClient(() =>
        useRoom('11111111-1111-1111-1111-111111111111')
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.numero).toBe('101');
    });

    it('se deshabilita si id es string vacío', () => {
      const { result } = renderHookWithClient(() => useRoom(''));
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedRoomService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateRoom (optimistic update)', () => {
    it('añade la habitación a la lista inmediatamente y confirma tras success', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.rooms.lists(), [...mockRooms]);

      const { result } = renderHookWithClient(() => useCreateRoom(), {
        queryClient: qc,
      });

      result.current.mutate({
        numero: '999',
        tipo: 'SUITE',
        precio_noche: 200,
        descripcion: 'Habitación de prueba con descripción mínima.',
      });

      await waitFor(() => {
        const list = qc.getQueryData<Room[]>(queryKeys.rooms.lists());
        expect(list?.some((r) => r.numero === '999')).toBe(true);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const list = qc.getQueryData<Room[]>(queryKeys.rooms.lists())!;
      expect(list).toHaveLength(3);
      expect(mockedRoomService.create).toHaveBeenCalledWith({
        numero: '999',
        tipo: 'SUITE',
        precio_noche: 200,
        descripcion: 'Habitación de prueba con descripción mínima.',
      });
    });

    it('restaura la lista anterior si falla la mutación', async () => {
      mockedRoomService.create.mockRejectedValueOnce(
        new Error('Server down')
      );
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.rooms.lists(), [...mockRooms]);

      const onError = vi.fn();
      const { result } = renderHookWithClient(
        () => useCreateRoom(),
        { queryClient: qc }
      );

      result.current.mutate(
        {
          numero: '999',
          tipo: 'SUITE',
          precio_noche: 200,
          descripcion: 'Habitación de prueba con descripción mínima.',
        },
        { onError }
      );
      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(
        () => {
          const list = qc.getQueryData<Room[]>(queryKeys.rooms.lists()) ?? [];
          expect(list).toHaveLength(2);
        },
        { timeout: 3000 }
      );
      const finalList = qc.getQueryData<Room[]>(queryKeys.rooms.lists())!;
      expect(finalList.map((r) => r.numero)).toContain('101');
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('useUpdateRoom / useDeleteRoom', () => {
    it('actualiza optimísticamente la habitación', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.rooms.lists(), [...mockRooms]);
      await qc.setQueryData(
        queryKeys.rooms.detail('11111111-1111-1111-1111-111111111111'),
        mockRooms[0]
      );

      const { result } = renderHookWithClient(() => useUpdateRoom(), {
        queryClient: qc,
      });

      result.current.mutate({
        id: '11111111-1111-1111-1111-111111111111',
        payload: { precio_noche: 55 },
      });

      await waitFor(() => {
        const list = qc.getQueryData<Room[]>(queryKeys.rooms.lists());
        const updated = list?.find(
          (r) => r.id === '11111111-1111-1111-1111-111111111111'
        );
        expect(updated?.precio_noche).toBe(55);
      });
    });

    it('borra optimísticamente la habitación de la lista', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.rooms.lists(), [...mockRooms]);

      const { result } = renderHookWithClient(() => useDeleteRoom(), {
        queryClient: qc,
      });
      result.current.mutate('22222222-2222-2222-2222-222222222222');

      await waitFor(() => {
        const list = qc.getQueryData<Room[]>(queryKeys.rooms.lists());
        expect(list).toHaveLength(1);
      });
    });
  });
});
