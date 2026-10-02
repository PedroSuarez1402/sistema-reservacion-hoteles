import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  ApiErrorResponse,
  Cliente,
  Acompanante,
} from '../../types';
import clienteService, { type ClientesPaginatedResponse } from '../../services/cliente.service';
import { queryKeys, STALE_TIMES } from './queryKeys';

/* =========================================================
 *  Types
 * ========================================================= */

export type UseClientesPaginatedOptions<TSelected = ClientesPaginatedResponse> = Omit<
  UseQueryOptions<
    ClientesPaginatedResponse,
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.clientes)['lists']>
  >,
  'queryKey' | 'queryFn'
> & { keyword?: string; page?: number; limit?: number };

export type UseCreateClienteOptions = Omit<
  UseMutationOptions<
    Cliente,
    ApiErrorResponse,
    {
      documento: string;
      nombre: string;
      email: string;
      telefono?: string;
      direccion?: string;
      observaciones?: string;
      acompanantes?: Array<{ nombre: string; documento?: string; parentesco?: string; telefono?: string }>;
    },
    unknown
  >,
  'mutationFn' | 'mutationKey'
>;

export type UseUpdateClienteOptions = Omit<
  UseMutationOptions<Cliente, ApiErrorResponse, { id: string; payload: Partial<Cliente> }, unknown>,
  'mutationFn' | 'mutationKey'
>;

export type UseDeleteClienteOptions = Omit<
  UseMutationOptions<void, ApiErrorResponse, string, unknown>,
  'mutationFn' | 'mutationKey'
>;

function invalidateAllClientes(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const qk = q.queryKey as unknown[];
      return Array.isArray(qk) && qk.length >= 1 && qk[0] === 'clientes';
    },
  });
}

/* =========================================================
 *  Queries
 * ========================================================= */

export function useClientesPaginated<TSelected = ClientesPaginatedResponse>(
  options: UseClientesPaginatedOptions<TSelected> = {} as UseClientesPaginatedOptions<TSelected>
) {
  const { keyword, page = 1, limit = 8, ...rest } = options;
  return useQuery({
    queryKey: queryKeys.clientes.lists({ keyword, page, limit }),
    queryFn: async () =>
      clienteService.getAll({
        keyword: keyword && keyword.trim().length > 0 ? keyword : undefined,
        page,
        limit,
      }),
    staleTime: STALE_TIMES.CLIENTES_LIST,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
    ...rest,
  });
}

export function useClienteDetail(
  id: string,
  options: Omit<
    UseQueryOptions<
      Cliente,
      ApiErrorResponse,
      Cliente,
      ReturnType<(typeof queryKeys.clientes)['detail']>
    >,
    'queryKey' | 'queryFn'
  > = {}
) {
  return useQuery({
    queryKey: queryKeys.clientes.detail(id),
    queryFn: async () => clienteService.getById(id),
    staleTime: STALE_TIMES.CLIENTE_DETAIL,
    enabled: Boolean(id),
    ...options,
  });
}

/* =========================================================
 *  Mutations
 * ========================================================= */

export function useCreateCliente(options: UseCreateClienteOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['clientes', 'create'],
    mutationFn: async (payload) => clienteService.create(payload),
    async onSuccess() {
      await invalidateAllClientes(queryClient);
    },
    ...options,
  });
}

export function useUpdateCliente(options: UseUpdateClienteOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['clientes', 'update'],
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Cliente> }) =>
      clienteService.update(id, payload),
    async onSuccess(data, vars) {
      await invalidateAllClientes(queryClient);
      queryClient.setQueryData(queryKeys.clientes.detail(vars.id), data);
    },
    ...options,
  });
}

export function useDeleteCliente(options: UseDeleteClienteOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['clientes', 'delete'],
    mutationFn: async (id: string) => clienteService.delete(id),
    async onSuccess(_data, id) {
      await invalidateAllClientes(queryClient);
      queryClient.removeQueries({ queryKey: queryKeys.clientes.detail(id) });
    },
    ...options,
  });
}

export function useAddAcompanante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clienteId,
      payload,
    }: {
      clienteId: string;
      payload: { nombre: string; documento?: string; parentesco?: string; telefono?: string };
    }) => clienteService.addAcompanante(clienteId, payload),
    onSuccess: async (_data, variables) => {
      await invalidateAllClientes(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.clientes.detail(variables.clienteId) });
    },
  });
}

export function useDeleteAcompanante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clienteId,
      acompananteId,
    }: {
      clienteId: string;
      acompananteId: string;
    }) => clienteService.deleteAcompanante(clienteId, acompananteId),
    onSuccess: async (_data, variables) => {
      await invalidateAllClientes(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.clientes.detail(variables.clienteId) });
    },
  });
}
