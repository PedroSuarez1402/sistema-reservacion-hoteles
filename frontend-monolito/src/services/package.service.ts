import { api } from './api';
import type { ApiSuccessResponse, Paquete } from '../types';

interface PackageService {
  getAll: () => Promise<Paquete[]>;
  getById: (id: string) => Promise<Paquete>;
}

const packageService: PackageService = {
  async getAll() {
    const response = await api.get<ApiSuccessResponse<Paquete[]>>('/paquetes');
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiSuccessResponse<Paquete>>(`/paquetes/${id}`);
    return response.data.data;
  },
};

export default packageService;
