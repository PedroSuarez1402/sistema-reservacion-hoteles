'use client';

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import authService from '../../services/auth.service';
import type { ApiErrorResponse, User } from '../../types';
import { queryKeys, STALE_TIMES } from './queryKeys';
import useAuthStore from '../../store/useAuthStore';

export type UseMeOptions = Omit<
  UseQueryOptions<
    User | null,
    ApiErrorResponse,
    User | null,
    ReturnType<(typeof queryKeys.auth)['me']>
  >,
  'queryKey' | 'queryFn' | 'enabled'
> & { enabled?: boolean };

/**
 * Hook que obtiene el usuario autenticado desde `/users/me`.
 *
 * @remarks
 * - La consulta solo se habilita cuando existe un token en el store Zustand
 *   (`isAuthenticated === true`), evitando requests 401 spureos.
 * - **StaleTime**: 5 minutos. El perfil del usuario apenas cambia.
 * - Si la petición falla con 401, el interceptor Axios global limpia el token
 *   y redirige a `/login`; este hook devuelve `null` en ese caso.
 *
 * @example
 * ```tsx
 * const { data: me, isLoading } = useMe();
 * if (me?.rol === 'ADMIN') { /* vista admin *\/ }
 * ```
 */
export function useMe(options: UseMeOptions = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const { enabled: userEnabled = true, ...rest } = options;
  const enabled = userEnabled && !!isAuthenticated && !!token;

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      if (!isAuthenticated || !token) return null;
      try {
        const me = await authService.me();
        return me;
      } catch (err) {
        return null;
      }
    },
    staleTime: STALE_TIMES.AUTH_ME,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    enabled,
    ...rest,
  });
}
