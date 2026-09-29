'use client';

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';
import { syncStorageToCookies } from '../services/api';
import { Toaster } from '../components/ui/Toast';
import {
  queryKeys,
  STALE_TIMES,
  CACHE_TIMES,
} from '../hooks/query/queryKeys';

export { queryKeys, STALE_TIMES, CACHE_TIMES } from '../hooks/query/queryKeys';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.ROOMS_LIST,
        gcTime: CACHE_TIMES.DEFAULT,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
        retry: (failureCount, error: unknown) => {
          if (
            error &&
            typeof error === 'object' &&
            'statusCode' in error &&
            (error as { statusCode: number }).statusCode >= 400 &&
            (error as { statusCode: number }).statusCode < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (typeof window === 'undefined') return;
        console.error('[RQ Query Error]', query.queryKey, _error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (_error, _variables, _context, mutation) => {
        if (typeof window === 'undefined') return;
        console.error('[RQ Mutation Error]', mutation.options.mutationKey, _error);
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

function AuthSyncToCookies() {
  const token = useAuthStore((s) => s.token);
  const synced = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!synced.current) {
      syncStorageToCookies();
      synced.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeout = window.setTimeout(() => {
      syncStorageToCookies();
    }, 50);
    return () => window.clearTimeout(timeout);
  }, [token]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSyncToCookies />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
