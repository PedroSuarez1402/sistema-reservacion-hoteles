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
  CreateTagPayload,
  PaginatedResponse,
  Tag,
  UpdateTagPayload,
} from '../../types';
import tagService from '../../services/tag.service';
import { queryKeys, STALE_TIMES } from './queryKeys';

/* =========================================================
 *  Types
 * ========================================================= */

export type UseTagsOptions<TSelected = Tag[]> = Omit<
  UseQueryOptions<
    Tag[],
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.tags)['lists']>
  >,
  'queryKey' | 'queryFn'
> & { keyword?: string };

export type UseTagsPaginatedOptions<TSelected = PaginatedResponse<Tag>> = Omit<
  UseQueryOptions<
    PaginatedResponse<Tag>,
    ApiErrorResponse,
    TSelected,
    ReturnType<(typeof queryKeys.tags)['lists']>
  >,
  'queryKey' | 'queryFn'
> & { keyword?: string; page?: number; limit?: number };

export type UseCreateTagOptions = Omit<
  UseMutationOptions<Tag, ApiErrorResponse, CreateTagPayload, unknown>,
  'mutationFn' | 'mutationKey'
>;

export type UseUpdateTagOptions = Omit<
  UseMutationOptions<Tag, ApiErrorResponse, { id: string; payload: UpdateTagPayload }, unknown>,
  'mutationFn' | 'mutationKey'
>;

export type UseDeleteTagOptions = Omit<
  UseMutationOptions<void, ApiErrorResponse, string, unknown>,
  'mutationFn' | 'mutationKey'
>;

function invalidateAllTagsLists(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const qk = q.queryKey as unknown[];
      return (
        Array.isArray(qk) &&
        qk.length >= 3 &&
        qk[0] === 'tags' &&
        qk[1] === 'list'
      );
    },
  });
}

/* =========================================================
 *  Queries
 * ========================================================= */

export function useTags<TSelected = Tag[]>(
  options: UseTagsOptions<TSelected> = {} as UseTagsOptions<TSelected>
) {
  const { keyword, ...rest } = options;
  return useQuery({
    queryKey: queryKeys.tags.lists(),
    queryFn: async () => tagService.getAll(keyword ? { keyword } : undefined),
    staleTime: STALE_TIMES.TAGS_LIST,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    ...rest,
  });
}

export function useTagsPaginated<TSelected = PaginatedResponse<Tag>>(
  options: UseTagsPaginatedOptions<TSelected> = {} as UseTagsPaginatedOptions<TSelected>
) {
  const { keyword, page = 1, limit = 10, ...rest } = options;
  return useQuery({
    queryKey: queryKeys.tags.lists({ keyword, page, limit }),
    queryFn: async () =>
      tagService.getAllPaginated({
        keyword: keyword && keyword.trim().length > 0 ? keyword : undefined,
        page,
        limit,
      }),
    staleTime: STALE_TIMES.TAGS_LIST,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
    ...rest,
  });
}

/* =========================================================
 *  Mutations
 * ========================================================= */

export function useCreateTag(options: UseCreateTagOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['tags', 'create'],
    mutationFn: (payload: CreateTagPayload) => tagService.create(payload),
    async onSettled() {
      await invalidateAllTagsLists(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() });
    },
    ...options,
  });
}

export function useUpdateTag(options: UseUpdateTagOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['tags', 'update'],
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTagPayload }) =>
      tagService.update(id, payload),
    async onSuccess(data, vars) {
      await invalidateAllTagsLists(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.detail(vars.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() });
    },
    ...options,
  });
}

export function useDeleteTag(options: UseDeleteTagOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['tags', 'delete'],
    mutationFn: (id: string) => tagService.remove(id),
    async onSettled() {
      await invalidateAllTagsLists(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() });
      await queryClient.invalidateQueries({
        predicate: (q) =>
          (q.queryKey?.[0] as string) === 'rooms' && (q.queryKey?.[1] as string) === 'detail',
      });
    },
    ...options,
  });
}
