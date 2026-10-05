import { api } from './api';
import type {
  ApiSuccessResponse,
  CreatePaquetePayload,
  Paquete,
  UpdatePaquetePayload,
} from '../types';

interface PackageService {
  getAll: (params?: { all?: boolean; estado?: string }) => Promise<Paquete[]>;
  getById: (id: string) => Promise<Paquete>;
  create: (payload: CreatePaquetePayload) => Promise<Paquete>;
  update: (id: string, payload: UpdatePaquetePayload) => Promise<Paquete>;
  toggleStatus: (id: string, estado?: 'ACTIVO' | 'INACTIVO') => Promise<Paquete>;
  delete: (id: string) => Promise<{ deleted: boolean; deactivated: boolean; message: string }>;
}

const packageService: PackageService = {
  async getAll(params) {
    const response = await api.get<ApiSuccessResponse<Paquete[]>>('/paquetes', { params });
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiSuccessResponse<Paquete>>(`/paquetes/${id}`);
    return response.data.data;
  },

  async create(payload: CreatePaquetePayload) {
    const response = await api.post<ApiSuccessResponse<Paquete>>('/paquetes', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdatePaquetePayload) {
    const response = await api.put<ApiSuccessResponse<Paquete>>(`/paquetes/${id}`, payload);
    return response.data.data;
  },

  async toggleStatus(id: string, estado?: 'ACTIVO' | 'INACTIVO') {
    const response = await api.patch<ApiSuccessResponse<Paquete>>(`/paquetes/${id}/status`, {
      estado,
    });
    return response.data.data;
  },

  async delete(id: string) {
    const response = await api.delete<
      ApiSuccessResponse<{ deleted: boolean; deactivated: boolean; message: string }>
    >(`/paquetes/${id}`);
    return response.data.data;
  },
};

export default packageService;
