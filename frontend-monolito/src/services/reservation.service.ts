import { api } from './api';
import type {
  Reservation,
  CreateReservationPayload,
  ApiSuccessResponse,
  UpdateReservationStatusPayload,
} from '../types';

interface ReservationService {
  getAll: () => Promise<Reservation[]>;
  getMyReservations: () => Promise<Reservation[]>;
  getById: (id: string) => Promise<Reservation>;
  create: (payload: CreateReservationPayload) => Promise<Reservation>;
  cancel: (id: string) => Promise<Reservation>;
  updateStatus: (
    id: string,
    payload: UpdateReservationStatusPayload
  ) => Promise<Reservation>;
  remove: (id: string) => Promise<void>;
}

const reservationService: ReservationService = {
  async getAll() {
    const response =
      await api.get<ApiSuccessResponse<Reservation[]>>('/reservations');
    return response.data.data;
  },

  async getMyReservations() {
    const response = await api.get<ApiSuccessResponse<Reservation[]>>(
      '/reservations/me'
    );
    return response.data.data;
  },

  async getById(id) {
    const response = await api.get<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}`
    );
    return response.data.data;
  },

  async create(payload) {
    const response = await api.post<ApiSuccessResponse<Reservation>>(
      '/reservations',
      payload
    );
    return response.data.data;
  },

  async cancel(id) {
    const response = await api.patch<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}/cancel`
    );
    return response.data.data;
  },

  async updateStatus(id, payload) {
    const response = await api.put<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}`,
      payload
    );
    return response.data.data;
  },

  async remove(id) {
    await api.delete(`/reservations/${id}`);
  },
};

export default reservationService;
