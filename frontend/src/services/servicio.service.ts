import { api } from './api';
import type {
  ApiSuccessResponse,
  CreateServicioPayload,
  ServicioAdicional,
  UpdateServicioPayload,
} from '../types';

interface ServicioService {
  getAll: (params?: { all?: boolean; estado?: string }) => Promise<ServicioAdicional[]>;
  getById: (id: string) => Promise<ServicioAdicional>;
  create: (payload: CreateServicioPayload) => Promise<ServicioAdicional>;
  update: (id: string, payload: UpdateServicioPayload) => Promise<ServicioAdicional>;
  toggleStatus: (id: string, estado?: 'ACTIVO' | 'INACTIVO') => Promise<ServicioAdicional>;
  delete: (id: string) => Promise<{ deleted: boolean; deactivated: boolean; message: string }>;
}

const servicioService: ServicioService = {
  async getAll(params) {
    const response = await api.get<ApiSuccessResponse<ServicioAdicional[]>>('/servicios', {
      params,
    });
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiSuccessResponse<ServicioAdicional>>(`/servicios/${id}`);
    return response.data.data;
  },

  async create(payload: CreateServicioPayload) {
    const response = await api.post<ApiSuccessResponse<ServicioAdicional>>('/servicios', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateServicioPayload) {
    const response = await api.put<ApiSuccessResponse<ServicioAdicional>>(
      `/servicios/${id}`,
      payload
    );
    return response.data.data;
  },

  async toggleStatus(id: string, estado?: 'ACTIVO' | 'INACTIVO') {
    const response = await api.patch<ApiSuccessResponse<ServicioAdicional>>(
      `/servicios/${id}/status`,
      { estado }
    );
    return response.data.data;
  },

  async delete(id: string) {
    const response = await api.delete<
      ApiSuccessResponse<{ deleted: boolean; deactivated: boolean; message: string }>
    >(`/servicios/${id}`);
    return response.data.data;
  },
};

export default servicioService;
