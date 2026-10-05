import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiErrorResponse,
  CreatePaquetePayload,
  Paquete,
  UpdatePaquetePayload,
} from '../../types';
import packageService from '../../services/package.service';

export function usePackages(params?: { all?: boolean; estado?: string }) {
  return useQuery<Paquete[], ApiErrorResponse>({
    queryKey: ['packages', 'list', params],
    queryFn: () => packageService.getAll(params),
    staleTime: 30 * 1000,
  });
}

export function usePackage(id?: string) {
  return useQuery<Paquete, ApiErrorResponse>({
    queryKey: ['packages', 'detail', id],
    queryFn: () => packageService.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation<Paquete, ApiErrorResponse, CreatePaquetePayload>({
    mutationKey: ['packages', 'create'],
    mutationFn: (payload) => packageService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation<Paquete, ApiErrorResponse, { id: string; payload: UpdatePaquetePayload }>({
    mutationKey: ['packages', 'update'],
    mutationFn: ({ id, payload }) => packageService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['packages', 'detail', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useTogglePackageStatus() {
  const queryClient = useQueryClient();

  return useMutation<Paquete, ApiErrorResponse, { id: string; estado?: 'ACTIVO' | 'INACTIVO' }>({
    mutationKey: ['packages', 'toggleStatus'],
    mutationFn: ({ id, estado }) => packageService.toggleStatus(id, estado),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['packages', 'detail', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation<
    { deleted: boolean; deactivated: boolean; message: string },
    ApiErrorResponse,
    string
  >({
    mutationKey: ['packages', 'delete'],
    mutationFn: (id) => packageService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export default usePackages;
