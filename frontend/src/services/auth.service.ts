import { api, setToken } from './api';
import type {
  AuthResponse,
  AuthResult,
  LoginCredentials,
  RegisterPayload,
  User,
  ApiSuccessResponse,
} from '../types';

interface AuthService {
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  me: () => Promise<User>;
  logout: () => void;
}

const authService: AuthService = {
  async login(credentials: LoginCredentials) {
    const { email, password } = credentials;

    const response = await api.post<AuthResponse>('/users/login', {
      email,
      password,
    });

    const result = response.data;

    if (!result.success || !result.data || !result.token) {
      throw new Error(result.message || 'Error al iniciar sesión');
    }

    setToken(result.token);

    return {
      user: result.data,
      token: result.token,
    };
  },

  async register(payload: RegisterPayload) {
    const { nombre, email, password } = payload;

    const response = await api.post<AuthResponse>('/users', {
      nombre,
      email,
      password,
    });

    const result = response.data;

    if (!result.success || !result.data || !result.token) {
      throw new Error(result.message || 'Error al registrar la cuenta');
    }

    setToken(result.token);

    return {
      user: result.data,
      token: result.token,
    };
  },

  async me() {
    const response = await api.get<ApiSuccessResponse<User>>('/users/me');

    const result = response.data;

    if (!result.success) {
      throw new Error('No se pudo obtener la información del usuario');
    }

    return result.data;
  },

  logout() {
    setToken(null);
  },
};

export default authService;
