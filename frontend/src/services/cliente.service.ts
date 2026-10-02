import { api } from './api';
import type {
  ApiSuccessResponse,
  Cliente,
  Acompanante,
  PaginationMeta,
} from '../types';

export interface ClientesPaginatedResponse {
  items: Cliente[];
  meta: PaginationMeta;
}

export const clienteService = {
  /**
   * Búsqueda en vivo para autocomplete / combobox
   */
  async search(keyword: string): Promise<Cliente[]> {
    const res = await api.get<ApiSuccessResponse<Cliente[]>>('/clientes/search', {
      params: { keyword: keyword.trim() },
    });
    return res.data.data ?? [];
  },

  /**
   * Listado paginado de clientes
   */
  async getAll(params?: { page?: number; limit?: number; keyword?: string }): Promise<ClientesPaginatedResponse> {
    const res = await api.get<ApiSuccessResponse<Cliente[]> & { meta?: PaginationMeta }>('/clientes', {
      params,
    });
    const page = params?.page ?? 1;
    const perPage = params?.limit ?? 10;
    const backendMeta = (res.data as any).meta ?? {};
    const total = backendMeta.total ?? (res.data.data?.length ?? 0);
    const totalPages = backendMeta.totalPages ?? (Math.ceil(total / perPage) || 1);

    return {
      items: res.data.data ?? [],
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  },

  /**
   * Detalle de un cliente
   */
  async getById(id: string): Promise<Cliente> {
    const res = await api.get<ApiSuccessResponse<Cliente>>(`/clientes/${id}`);
    return res.data.data;
  },

  /**
   * Consulta directa por documento (cédula / pasaporte)
   */
  async getByDocumento(documento: string): Promise<Cliente | null> {
    try {
      const res = await api.get<ApiSuccessResponse<Cliente>>(`/clientes/doc/${encodeURIComponent(documento.trim())}`);
      return res.data.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Crear nuevo cliente
   */
  async create(payload: {
    documento: string;
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
    observaciones?: string;
    acompanantes?: Array<{ nombre: string; documento?: string; parentesco?: string; telefono?: string }>;
  }): Promise<Cliente> {
    const res = await api.post<ApiSuccessResponse<Cliente>>('/clientes', payload);
    return res.data.data;
  },

  /**
   * Resolver o crear cliente
   */
  async findOrCreate(payload: {
    documento: string;
    nombre: string;
    email: string;
    telefono?: string;
    acompanantes?: Array<{ nombre: string; documento?: string; parentesco?: string; telefono?: string }>;
  }): Promise<Cliente> {
    const res = await api.post<ApiSuccessResponse<Cliente>>('/clientes/find-or-create', payload);
    return res.data.data;
  },

  /**
   * Actualizar datos del cliente
   */
  async update(id: string, payload: Partial<Cliente>): Promise<Cliente> {
    const res = await api.put<ApiSuccessResponse<Cliente>>(`/clientes/${id}`, payload);
    return res.data.data;
  },

  /**
   * Eliminar cliente
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/clientes/${id}`);
  },

  /**
   * Agregar acompañante
   */
  async addAcompanante(clienteId: string, payload: {
    nombre: string;
    documento?: string;
    parentesco?: string;
    telefono?: string;
    reserva_id?: string;
  }): Promise<Acompanante> {
    const res = await api.post<ApiSuccessResponse<Acompanante>>(`/clientes/${clienteId}/acompanantes`, payload);
    return res.data.data;
  },

  /**
   * Eliminar acompañante
   */
  async deleteAcompanante(clienteId: string, acompananteId: string): Promise<void> {
    await api.delete(`/clientes/${clienteId}/acompanantes/${acompananteId}`);
  },
};

export default clienteService;
