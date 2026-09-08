import { api } from './api';
import type {
  ApiSuccessResponse,
  CreateTagPayload,
  Tag,
  UpdateTagPayload,
} from '../types';

interface TagService {
  getAll: (params?: { keyword?: string }) => Promise<Tag[]>;
  getById: (id: string) => Promise<Tag>;
  create: (payload: CreateTagPayload) => Promise<Tag>;
  update: (id: string, payload: UpdateTagPayload) => Promise<Tag>;
  remove: (id: string) => Promise<void>;
}

const tagService: TagService = {
  async getAll(params) {
    const response = await api.get<ApiSuccessResponse<Tag[]>>('/tags', {
      params: {
        keyword: params?.keyword,
      },
    });
    return response.data.data;
  },

  async getById(id) {
    const response = await api.get<ApiSuccessResponse<Tag>>(`/tags/${id}`);
    return response.data.data;
  },

  async create(payload) {
    const response = await api.post<ApiSuccessResponse<Tag>>('/tags', payload);
    return response.data.data;
  },

  async update(id, payload) {
    const response = await api.patch<ApiSuccessResponse<Tag>>(`/tags/${id}`, payload);
    return response.data.data;
  },

  async remove(id) {
    await api.delete(`/tags/${id}`);
  },
};

export default tagService;
