import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiErrorResponse,
  CreateServicioPayload,
  ServicioAdicional,
  UpdateServicioPayload,
} from '../../types';
import servicioService from '../../services/servicio.service';

export function useServices(params?: { all?: boolean; estado?: string }) {
  return useQuery<ServicioAdicional[], ApiErrorResponse>({
    queryKey: ['services', 'list', params],
    queryFn: () => servicioService.getAll(params),
    staleTime: 30 * 1000,
  });
}

export function useService(id?: string) {
  return useQuery<ServicioAdicional, ApiErrorResponse>({
    queryKey: ['services', 'detail', id],
    queryFn: () => servicioService.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation<ServicioAdicional, ApiErrorResponse, CreateServicioPayload>({
    mutationKey: ['services', 'create'],
    mutationFn: (payload) => servicioService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation<
    ServicioAdicional,
    ApiErrorResponse,
    { id: string; payload: UpdateServicioPayload }
  >({
    mutationKey: ['services', 'update'],
    mutationFn: ({ id, payload }) => servicioService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['services', 'detail', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    ServicioAdicional,
    ApiErrorResponse,
    { id: string; estado?: 'ACTIVO' | 'INACTIVO' }
  >({
    mutationKey: ['services', 'toggleStatus'],
    mutationFn: ({ id, estado }) => servicioService.toggleStatus(id, estado),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['services', 'detail', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation<
    { deleted: boolean; deactivated: boolean; message: string },
    ApiErrorResponse,
    string
  >({
    mutationKey: ['services', 'delete'],
    mutationFn: (id) => servicioService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export default useServices;
