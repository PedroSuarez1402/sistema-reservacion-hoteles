import { api } from './api';
import type {
  ApiSuccessResponse,
  ClientListItem,
  PaginatedResponse,
  UpdateUserPayload,
  User,
  UserRole,
} from '../types';

interface UserService {
  getAllPaginated: (params?: {
    keyword?: string;
    page?: number;
    limit?: number;
    rol?: UserRole;
  }) => Promise<PaginatedResponse<ClientListItem>>;
  getById: (id: string) => Promise<User>;
  getSummary: (id: string) => Promise<ClientListItem>;
  update: (id: string, payload: UpdateUserPayload) => Promise<User>;
  remove: (id: string) => Promise<void>;
}

const userService: UserService = {
  async getAllPaginated(params) {
    const response = await api.get<ApiSuccessResponse<ClientListItem[]>>('/users', {
      params: {
        keyword: params?.keyword,
        page: params?.page,
        limit: params?.limit,
        rol: params?.rol,
      },
    });
    const meta = response.data.meta;
    return {
      items: response.data.data ?? [],
      meta: {
        total: Number(meta?.total) ?? 0,
        page: Number(meta?.page) ?? 1,
        perPage: Number(meta?.perPage) ?? 8,
        totalPages: Number(meta?.totalPages) ?? 1,
        hasNextPage: Boolean(meta?.hasNextPage),
        hasPrevPage: Boolean(meta?.hasPrevPage),
      },
    };
  },

  async getById(id) {
    const response = await api.get<ApiSuccessResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  async getSummary(id) {
    const response = await api.get<ApiSuccessResponse<ClientListItem>>(`/users/${id}/summary`);
    return response.data.data;
  },

  async update(id, payload) {
    const response = await api.put<ApiSuccessResponse<User>>(`/users/${id}`, payload);
    return response.data.data;
  },

  async remove(id) {
    await api.delete(`/users/${id}`);
  },
};

export default userService;
