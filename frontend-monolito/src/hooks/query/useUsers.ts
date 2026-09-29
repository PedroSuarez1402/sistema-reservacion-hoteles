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
  ClientListItem,
  PaginatedResponse,
  UpdateUserPayload,
  User,
  UserRole,
} from '../../types';
import userService from '../../services/user.service';
import { queryKeys, STALE_TIMES } from './queryKeys';

/* =========================================================
 *  Types
 * ========================================================= */

export type UseUsersPaginatedOptions<TSelected = PaginatedResponse<ClientListItem>> = Omit<
  UseQueryOptions<
    PaginatedResponse<ClientListItem>,
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.users)['lists']>
  >,
  'queryKey' | 'queryFn'
> & { keyword?: string; page?: number; limit?: number; rol?: UserRole };

export type UseUpdateUserOptions = Omit<
  UseMutationOptions<User, ApiErrorResponse, { id: string; payload: UpdateUserPayload }, unknown>,
  'mutationFn' | 'mutationKey'
>;

export type UseDeleteUserOptions = Omit<
  UseMutationOptions<void, ApiErrorResponse, string, unknown>,
  'mutationFn' | 'mutationKey'
>;

function invalidateAllUsersLists(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const qk = q.queryKey as unknown[];
      return (
        Array.isArray(qk) &&
        qk.length >= 3 &&
        qk[0] === 'users' &&
        qk[1] === 'list'
      );
    },
  });
}

/* =========================================================
 *  Queries
 * ========================================================= */

export function useUsersPaginated<TSelected = PaginatedResponse<ClientListItem>>(
  options: UseUsersPaginatedOptions<TSelected> = {} as UseUsersPaginatedOptions<TSelected>
) {
  const { keyword, page = 1, limit = 8, rol, ...rest } = options;
  return useQuery({
    queryKey: queryKeys.users.lists({ keyword, page, limit, rol }),
    queryFn: async () =>
      userService.getAllPaginated({
        keyword: keyword && keyword.trim().length > 0 ? keyword : undefined,
        page,
        limit,
        rol,
      }),
    staleTime: STALE_TIMES.USERS_LIST,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
    ...rest,
  });
}

export function useUserSummary(
  id: string,
  options: Omit<
    UseQueryOptions<
      ClientListItem,
      ApiErrorResponse,
      ClientListItem,
      ReturnType<(typeof queryKeys.users)['summary']>
    >,
    'queryKey' | 'queryFn'
  > = {}
) {
  return useQuery({
    queryKey: queryKeys.users.summary(id),
    queryFn: async () => userService.getSummary(id),
    staleTime: STALE_TIMES.USER_DETAIL,
    enabled: Boolean(id),
    ...options,
  });
}

/* =========================================================
 *  Mutations
 * ========================================================= */

export function useUpdateUser(options: UseUpdateUserOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['users', 'update'],
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      userService.update(id, payload),
    async onSuccess(data, vars) {
      await invalidateAllUsersLists(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(vars.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.summary(vars.id) });
    },
    ...options,
  });
}

export function useDeleteUser(options: UseDeleteUserOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['users', 'delete'],
    mutationFn: (id: string) => userService.remove(id),
    async onSettled() {
      await invalidateAllUsersLists(queryClient);
    },
    ...options,
  });
}
