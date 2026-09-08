import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { ApiErrorResponse, CreateTagPayload, Tag, UpdateTagPayload } from '../../types';
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

export type UseCreateTagOptions = Omit<
  UseMutationOptions<Tag, ApiErrorResponse, CreateTagPayload, unknown>,
  'mutationFn' | 'mutationKey'
>;

export type UseUpdateTagOptions = Omit<
  UseMutationOptions<Tag, ApiErrorResponse, { id: string; payload: UpdateTagPayload }, unknown>,
  'mutationFn' | 'mutationKey'
>;

export type UseDeleteTagOptions = Omit<
  UseMutationOptions<void, ApiErrorResponse, string, { previousTags: Tag[] | undefined }>,
  'mutationFn' | 'mutationKey'
>;

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

/* =========================================================
 *  Mutations
 * ========================================================= */

export function useCreateTag(options: UseCreateTagOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['tags', 'create'],
    mutationFn: (payload: CreateTagPayload) => tagService.create(payload),
    async onSettled() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.lists() });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.lists() });
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
    async onMutate(id: string) {
      await queryClient.cancelQueries({ queryKey: queryKeys.tags.lists() });
      const previousTags = queryClient.getQueryData<Tag[]>(queryKeys.tags.lists());
      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          queryKeys.tags.lists(),
          previousTags.filter((t) => t.id !== id)
        );
      }
      return { previousTags: previousTags ?? undefined };
    },
    onError(_err, _id, ctx) {
      const prev = ctx?.previousTags;
      if (prev) {
        queryClient.setQueryData<Tag[]>(queryKeys.tags.lists(), prev);
      }
    },
    async onSettled() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.lists() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() });
      await queryClient.invalidateQueries({
        predicate: (q) => (q.queryKey?.[0] as string) === 'rooms' && (q.queryKey?.[1] as string) === 'detail',
      });
    },
    ...options,
  });
}
