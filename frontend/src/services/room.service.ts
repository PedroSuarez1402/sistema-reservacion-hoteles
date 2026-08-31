import { api } from './api';
import type {
  Room,
  RoomAvailabilityParams,
  ApiSuccessResponse,
  CreateRoomPayload,
  UpdateRoomPayload,
} from '../types';

interface RoomService {
  getAll: () => Promise<Room[]>;
  getById: (id: string) => Promise<Room>;
  getAvailable: (params: RoomAvailabilityParams) => Promise<Room[]>;
  create: (payload: CreateRoomPayload) => Promise<Room>;
  update: (id: string, payload: UpdateRoomPayload) => Promise<Room>;
  remove: (id: string) => Promise<void>;
}

const roomService: RoomService = {
  async getAll() {
    const response = await api.get<ApiSuccessResponse<Room[]>>('/rooms');
    return response.data.data;
  },

  async getById(id) {
    const response = await api.get<ApiSuccessResponse<Room>>(`/rooms/${id}`);
    return response.data.data;
  },

  async getAvailable(params) {
    const response = await api.get<ApiSuccessResponse<Room[]>>('/rooms/available', {
      params: {
        fecha_inicio: params.fecha_inicio,
        fecha_fin: params.fecha_fin,
      },
    });
    return response.data.data;
  },

  async create(payload) {
    const response = await api.post<ApiSuccessResponse<Room>>('/rooms', payload);
    return response.data.data;
  },

  async update(id, payload) {
    const response = await api.put<ApiSuccessResponse<Room>>(
      `/rooms/${id}`,
      payload
    );
    return response.data.data;
  },

  async remove(id) {
    await api.delete(`/rooms/${id}`);
  },
};

export default roomService;
