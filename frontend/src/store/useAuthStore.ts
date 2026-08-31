'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import authService from '../services/auth.service';
import type {
  User,
  UserRole,
  LoginCredentials,
  RegisterPayload,
} from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  setError: (error: string | null) => void;

  isAdmin: () => boolean;
  isRecepcion: () => boolean;
  isRecepcionOrAdmin: () => boolean;
  isHuesped: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

function resolveStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return {
    getItem: (name: string) => window.localStorage.getItem(name),
    setItem: (name: string, value: string) => window.localStorage.setItem(name, value),
    removeItem: (name: string) => window.localStorage.removeItem(name),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      async login(credentials) {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.login(credentials);
          if (result) {
            set({
              user: result.user,
              token: result.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      async register(payload) {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.register(payload);
          if (result) {
            set({
              user: result.user,
              token: result.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Error al crear la cuenta';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      async fetchMe() {
        const { token, isAuthenticated } = get();
        if (!token || !isAuthenticated) return;

        set({ isLoading: true, error: null });
        try {
          const user = await authService.me();
          set({ user, isLoading: false });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Error al obtener datos del usuario';
          set({ isLoading: false, error: message });
          if (!get().user) {
            get().logout();
          }
        }
      },

      logout() {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      setError(error) {
        set({ error });
      },

      isAdmin() {
        return get().user?.rol === 'ADMIN';
      },

      isRecepcion() {
        return get().user?.rol === 'RECEPCION';
      },

      isRecepcionOrAdmin() {
        const rol = get().user?.rol;
        return rol === 'ADMIN' || rol === 'RECEPCION';
      },

      isHuesped() {
        return get().user?.rol === 'HUESPED';
      },

      hasRole(roles) {
        const rol = get().user?.rol;
        return !!rol && roles.includes(rol);
      },
    }),
    {
      name: 'hotel-auth-storage',
      storage: createJSONStorage(() => resolveStorage()),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
