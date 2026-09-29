import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import reservationService from '../../../services/reservation.service';
import type { Reservation } from '../../../types';
import {
  useAllReservations,
  useMyReservations,
  useCancelReservation,
  useUpdateReservationStatus,
  useDeleteReservation,
  useCreateReservation,
} from '../useReservations';
import {
  createTestQueryClient,
  renderHookWithClient,
} from '../../../test/react-query-wrapper';
import { queryKeys } from '../queryKeys';

vi.mock('../../../services/reservation.service');

const baseDate = (days: number) =>
  new Date(2026, 9, 1 + days).toISOString().slice(0, 10);

const mockList: Reservation[] = [
  {
    id: 'r1',
    usuario_id: 'u1',
    habitacion_id: 'h1',
    fecha_inicio: baseDate(0),
    fecha_fin: baseDate(2),
    precio_total: 90,
    estado: 'CONFIRMADA',
  },
  {
    id: 'r2',
    usuario_id: 'u1',
    habitacion_id: 'h2',
    fecha_inicio: baseDate(5),
    fecha_fin: baseDate(7),
    precio_total: 150,
    estado: 'PENDIENTE',
  },
];

const mocked = vi.mocked(reservationService);

describe('hooks/query/useReservations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocked.getAll.mockResolvedValue([...mockList]);
    mocked.getMyReservations.mockResolvedValue([...mockList]);
    mocked.getById.mockImplementation(async (id) => {
      return (
        mockList.find((r) => r.id === id) ?? Promise.reject(new Error('nf'))
      );
    });
    mocked.cancel.mockImplementation(async (id) => {
      const r = mockList.find((x) => x.id === id);
      if (!r) throw new Error('nf');
      return { ...r, estado: 'CANCELADA' };
    });
    mocked.updateStatus.mockImplementation(async (id, payload) => {
      const r = mockList.find((x) => x.id === id);
      if (!r) throw new Error('nf');
      return { ...r, estado: payload.estado };
    });
    mocked.remove.mockResolvedValue(undefined);
    mocked.create.mockImplementation(async (payload) => ({
      id: `new_${Date.now()}`,
      usuario_id: 'u1',
      habitacion_id: payload.habitacion_id,
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      precio_total: 100,
      estado: 'CONFIRMADA',
    }));
  });

  describe('lectura (query)', () => {
    it('useAllReservations carga desde el servicio y expone data / refetch / isLoading', async () => {
      const { result } = renderHookWithClient(() => useAllReservations());
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(typeof result.current.refetch).toBe('function');
      expect(mocked.getAll).toHaveBeenCalledTimes(1);
    });

    it('useMyReservations usa queryKey ["reservations","mine"]', async () => {
      const qc = createTestQueryClient();
      const { result } = renderHookWithClient(() => useMyReservations(), {
        queryClient: qc,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(qc.getQueryData(queryKeys.reservations.myList())).toHaveLength(2);
    });
  });

  describe('useCancelReservation (optimistic)', () => {
    it('marca estado = CANCELADA en listas + detalle antes de la respuesta', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.reservations.lists(), [...mockList]);
      await qc.setQueryData(queryKeys.reservations.myList(), [...mockList]);
      await qc.setQueryData(queryKeys.reservations.detail('r1'), mockList[0]);

      const { result } = renderHookWithClient(() => useCancelReservation(), {
        queryClient: qc,
      });
      result.current.mutate('r1');

      await waitFor(() => {
        const list = qc.getQueryData<Reservation[]>(queryKeys.reservations.lists())!;
        expect(list.find((r) => r.id === 'r1')?.estado).toBe('CANCELADA');
        const mine = qc.getQueryData<Reservation[]>(queryKeys.reservations.myList())!;
        expect(mine.find((r) => r.id === 'r1')?.estado).toBe('CANCELADA');
        const detail = qc.getQueryData<Reservation>(queryKeys.reservations.detail('r1'));
        expect(detail?.estado).toBe('CANCELADA');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mocked.cancel).toHaveBeenCalledWith('r1');
    });

    it('deshace cambio si falla cancel', async () => {
      mocked.cancel.mockRejectedValueOnce(new Error('500'));
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.reservations.lists(), [...mockList]);
      const { result } = renderHookWithClient(() => useCancelReservation(), {
        queryClient: qc,
      });
      result.current.mutate('r1');
      await waitFor(() => expect(result.current.isError).toBe(true));
      const list = qc.getQueryData<Reservation[]>(queryKeys.reservations.lists())!;
      expect(list.find((r) => r.id === 'r1')?.estado).toBe('CONFIRMADA');
    });
  });

  describe('useUpdateReservationStatus', () => {
    it('actualiza a FINALIZADA de forma optimista', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.reservations.lists(), [...mockList]);

      const { result } = renderHookWithClient(
        () => useUpdateReservationStatus(),
        { queryClient: qc }
      );
      result.current.mutate({ id: 'r2', payload: { estado: 'FINALIZADA' } });
      await waitFor(() => {
        const list = qc.getQueryData<Reservation[]>(queryKeys.reservations.lists())!;
        expect(list.find((r) => r.id === 'r2')?.estado).toBe('FINALIZADA');
      });
    });
  });

  describe('useDeleteReservation', () => {
    it('elimina de las listas sin esperar al backend', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.reservations.lists(), [...mockList]);
      await qc.setQueryData(queryKeys.reservations.myList(), [...mockList]);

      const { result } = renderHookWithClient(() => useDeleteReservation(), {
        queryClient: qc,
      });
      result.current.mutate('r1');
      await waitFor(() => {
        expect(qc.getQueryData<Reservation[]>(queryKeys.reservations.lists())).toHaveLength(1);
        expect(qc.getQueryData<Reservation[]>(queryKeys.reservations.myList())).toHaveLength(1);
      });
    });
  });

  describe('useCreateReservation', () => {
    it('inserta temporal en PENDIENTE y valida tras success', async () => {
      const qc = createTestQueryClient();
      await qc.setQueryData(queryKeys.reservations.lists(), [...mockList]);
      await qc.setQueryData(queryKeys.reservations.myList(), [...mockList]);

      const { result } = renderHookWithClient(() => useCreateReservation(), {
        queryClient: qc,
      });
      result.current.mutate({
        habitacion_id: 'h3',
        fecha_inicio: baseDate(10),
        fecha_fin: baseDate(12),
      });

      await waitFor(() => {
        const all = qc.getQueryData<Reservation[]>(queryKeys.reservations.lists())!;
        expect(all).toHaveLength(3);
        const pendiente = all.find((r) => r.estado === 'PENDIENTE');
        expect(pendiente?.habitacion_id).toBe('h3');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const final = qc.getQueryData<Reservation[]>(queryKeys.reservations.lists())!;
      expect(final).toHaveLength(3);
    });
  });
});
