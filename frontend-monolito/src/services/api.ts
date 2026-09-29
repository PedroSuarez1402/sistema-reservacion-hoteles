import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'hotel_auth_token';
const TOKEN_COOKIE = 'hotel_auth_token';
const AUTH_STORAGE_COOKIE = 'hotel-auth-storage';

class ApiError extends Error {
  public statusCode: number;
  public originalError?: unknown;

  constructor(message: string, statusCode: number, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

function setAuthCookie(name: string, value: string, days = 7): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearAuthCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function syncStorageToCookies(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('hotel-auth-storage');
    if (raw) {
      setAuthCookie(AUTH_STORAGE_COOKIE, raw);
    }
  } catch {
    // ignore
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
      setAuthCookie(TOKEN_COOKIE, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
      clearAuthCookie(TOKEN_COOKIE);
      clearAuthCookie(AUTH_STORAGE_COOKIE);
      window.localStorage.removeItem('hotel-auth-storage');
    }
  } catch {
    // Silenciar errores de localStorage (modo privado, etc.)
  }
}

function onRequestFulfilled(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.headers && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
}

function onRequestRejected(error: unknown): Promise<never> {
  return Promise.reject(error);
}

function onResponseFulfilled<T>(response: AxiosResponse<T>): AxiosResponse<T> {
  return response;
}

function onResponseRejected(error: unknown): Promise<never> {
  if (axios.isAxiosError(error) && error.response) {
    const { status, data } = error.response;
    const errorData = data as ApiErrorResponse;
    const message = errorData?.message || error.message || 'Error desconocido';

    if (status === 401) {
      setToken(null);
      if (typeof window !== 'undefined') {
        const publicPaths = ['/login', '/register', '/'];
        const currentPath = window.location.pathname;
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(new ApiError(message, status, error));
  }

  return Promise.reject(
    new ApiError('Error de conexión con el servidor', 0, error)
  );
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(onRequestFulfilled, onRequestRejected);
api.interceptors.response.use(onResponseFulfilled, onResponseRejected);

export { api, getToken, setToken, syncStorageToCookies, ApiError, TOKEN_KEY };
export type { AxiosRequestConfig, AxiosResponse };
