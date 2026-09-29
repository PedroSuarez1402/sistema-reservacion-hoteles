import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import authService from '../../../services/auth.service';
import { useMe } from '../useAuth';
import type { User } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';

vi.mock('../../../services/auth.service');

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

const setAuthState = (state: Partial<{
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}>) => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isAdmin: () => false,
    isRecepcion: () => false,
    isRecepcionOrAdmin: () => false,
    isHuesped: () => false,
    hasRole: () => false,
    login: async () => {},
    register: async () => {},
    fetchMe: async () => {},
    logout: () => {},
    setError: () => {},
    ...state,
  });
};

describe('hooks/query/useAuth (useMe)', () => {
  const mockedAuthService = vi.mocked(authService);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({});
  });

  it('no hace fetch si no está autenticado', () => {
    setAuthState({ isAuthenticated: false, token: null });
    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedAuthService.me).not.toHaveBeenCalled();
  });

  it('invoca authService.me cuando hay token y retorna el usuario', async () => {
    const me: User = {
      id: 'u1',
      nombre: 'Juan',
      email: 'j@x.com',
      rol: 'HUESPED',
    };
    mockedAuthService.me.mockResolvedValue(me);
    setAuthState({ isAuthenticated: true, token: 'jwt-token' });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });
    expect(result.current.isFetching || result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nombre).toBe('Juan');
    expect(result.current.data?.rol).toBe('HUESPED');
    expect(mockedAuthService.me).toHaveBeenCalledTimes(1);
  });

  it('retorna null si authService.me lanza excepción', async () => {
    mockedAuthService.me.mockRejectedValue(new Error('401'));
    setAuthState({ isAuthenticated: true, token: 'jwt-token' });
    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('respeta la opción enabled del consumidor', async () => {
    setAuthState({ isAuthenticated: true, token: 'jwt-token' });
    const { result } = renderHook(() => useMe({ enabled: false }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedAuthService.me).not.toHaveBeenCalled();
  });
});
