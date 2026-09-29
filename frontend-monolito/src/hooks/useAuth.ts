'use client';

import { useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import type { LoginCredentials, RegisterPayload, UserRole } from '../types';

interface UseAuthReturn {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  token: ReturnType<typeof useAuthStore.getState>['token'];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  setError: (error: string | null) => void;

  isAdmin: boolean;
  isRecepcion: boolean;
  isRecepcionOrAdmin: boolean;
  isHuesped: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

function useAuth(): UseAuthReturn {
  const state = useAuthStore();

  useEffect(() => {
    if (state.token && state.isAuthenticated && !state.user) {
      void state.fetchMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    login: state.login,
    register: state.register,
    fetchMe: state.fetchMe,
    logout: state.logout,
    setError: state.setError,

    isAdmin: state.isAdmin(),
    isRecepcion: state.isRecepcion(),
    isRecepcionOrAdmin: state.isRecepcionOrAdmin(),
    isHuesped: state.isHuesped(),
    hasRole: state.hasRole,
  };
}

export default useAuth;
