import { api } from './api';
import type {
  Room,
  RoomImage,
  RoomAvailabilityParams,
  ApiSuccessResponse,
  CreateRoomPayload,
  UpdateRoomPayload,
  UploadImageProgressCb,
} from '../types';

interface RoomService {
  getAll: () => Promise<Room[]>;
  getById: (id: string) => Promise<Room>;
  getAvailable: (params: RoomAvailabilityParams) => Promise<Room[]>;
  create: (payload: CreateRoomPayload) => Promise<Room>;
  update: (id: string, payload: UpdateRoomPayload) => Promise<Room>;
  remove: (id: string) => Promise<void>;
  uploadImages: (
    roomId: string,
    files: File[],
    onProgress?: UploadImageProgressCb
  ) => Promise<RoomImage[]>;
  reorderImages: (roomId: string, ids: string[]) => Promise<RoomImage[]>;
  setMainImage: (roomId: string, imageId: string) => Promise<RoomImage[]>;
  deleteImage: (roomId: string, imageId: string) => Promise<void>;
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

  async uploadImages(roomId, files, onProgress) {
    const results: RoomImage[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const form = new FormData();
      form.append('images', file);
      const { data } = await api.post<{ data: RoomImage[]; status: string }>(
        `/rooms/${roomId}/images`,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress(event) {
            if (!onProgress) return;
            const total = Number(event.total) || file.size || 1;
            const loaded = Number(event.loaded) || 0;
            const percent = Math.min(100, Math.round((loaded / total) * 100));
            onProgress(file, percent);
          },
        }
      );
      if (Array.isArray(data?.data) && data.data.length > 0) {
        results.push(...data.data);
      }
    }
    return results;
  },

  async reorderImages(roomId, ids) {
    const { data } = await api.patch<ApiSuccessResponse<RoomImage[]>>(
      `/rooms/${roomId}/images/order`,
      { ids }
    );
    return data.data;
  },

  async setMainImage(roomId, imageId) {
    const { data } = await api.patch<ApiSuccessResponse<RoomImage[]>>(
      `/rooms/${roomId}/images/${imageId}/set-main`
    );
    return data.data;
  },

  async deleteImage(roomId, imageId) {
    await api.delete(`/rooms/${roomId}/images/${imageId}`);
  },
};

export default roomService;

