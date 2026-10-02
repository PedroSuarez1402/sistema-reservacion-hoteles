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
  update: (
    id: string,
    payload: Partial<CreateReservationPayload> | Record<string, unknown>
  ) => Promise<Reservation>;
  updateStatus: (
    id: string,
    payload: UpdateReservationStatusPayload
  ) => Promise<Reservation>;
  remove: (id: string) => Promise<void>;
  checkIn: (id: string, payload?: { observaciones?: string; metodo_pago?: string; anticipo?: number }) => Promise<Reservation>;
  checkOut: (id: string, payload?: { observaciones?: string }) => Promise<Reservation>;
  prorroga: (id: string, payload?: { motivo?: string; nueva_fecha_fin?: string }) => Promise<Reservation>;
  noShow: (id: string, payload?: { observaciones?: string }) => Promise<Reservation>;
  checkInReservation: (id: string, payload?: { observaciones?: string; metodo_pago?: string; anticipo?: number }) => Promise<Reservation>;
  checkOutReservation: (id: string, payload?: { observaciones?: string }) => Promise<Reservation>;
  prorrogaReservation: (id: string, nota?: string | { motivo?: string; nueva_fecha_fin?: string }, payload?: { motivo?: string; nueva_fecha_fin?: string }) => Promise<Reservation>;
  noShowReservation: (id: string, payload?: { observaciones?: string }) => Promise<Reservation>;
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

  async update(id, payload) {
    const response = await api.put<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}`,
      payload
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

  async checkIn(id, payload = {}) {
    const response = await api.patch<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}/check-in`,
      payload
    );
    return response.data.data;
  },

  async checkOut(id, payload = {}) {
    const response = await api.patch<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}/check-out`,
      payload
    );
    return response.data.data;
  },

  async prorroga(id, payload = {}) {
    const response = await api.patch<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}/prorroga`,
      payload
    );
    return response.data.data;
  },

  async noShow(id, payload = {}) {
    const response = await api.patch<ApiSuccessResponse<Reservation>>(
      `/reservations/${id}/no-show`,
      payload
    );
    return response.data.data;
  },

  checkInReservation(id, payload) {
    return this.checkIn(id, payload);
  },

  checkOutReservation(id, payload) {
    return this.checkOut(id, payload);
  },

  prorrogaReservation(id, nota, payload) {
    const body = typeof nota === 'string' ? { motivo: nota, ...payload } : (nota || payload || {});
    return this.prorroga(id, body);
  },

  noShowReservation(id, payload) {
    return this.noShow(id, payload);
  },
};

export const updateReservation = (
  id: string,
  payload: Partial<CreateReservationPayload> | Record<string, unknown>
) => reservationService.update(id, payload);

export const checkInReservation = (id: string, payload?: { observaciones?: string; metodo_pago?: string; anticipo?: number }) =>
  reservationService.checkIn(id, payload);

export const checkOutReservation = (id: string, payload?: { observaciones?: string }) =>
  reservationService.checkOut(id, payload);

export const prorrogaReservation = (id: string, nota?: string | { motivo?: string; nueva_fecha_fin?: string }, payload?: { motivo?: string; nueva_fecha_fin?: string }) =>
  reservationService.prorrogaReservation(id, nota, payload);

export const noShowReservation = (id: string, payload?: { observaciones?: string }) =>
  reservationService.noShow(id, payload);

export default reservationService;
