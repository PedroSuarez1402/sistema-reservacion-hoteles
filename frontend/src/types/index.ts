export type UserRole = 'HUESPED' | 'ADMIN' | 'RECEPCION';

export type RoomType = 'SENCILLA' | 'DOBLE' | 'SUITE';

export type RoomStatus = 'ACTIVA' | 'MANTENIMIENTO' | 'ELIMINADA';

export type ReservationStatus =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'FINALIZADA';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: string;
  numero: string;
  tipo: RoomType;
  precio_noche: number;
  estado: RoomStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reservation {
  id: string;
  usuario_id: string;
  habitacion_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio_total: number;
  estado: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
  habitacion?: Room;
  usuario?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: User;
  token?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface RoomAvailabilityParams {
  fecha_inicio: string;
  fecha_fin: string;
}

export interface CreateReservationPayload {
  habitacion_id: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface UpdateRoomPayload {
  numero?: string;
  tipo?: RoomType;
  precio_noche?: number;
  estado?: RoomStatus;
}

export interface CreateRoomPayload {
  numero: string;
  tipo: RoomType;
  precio_noche: number;
}

export interface UpdateReservationStatusPayload {
  estado: ReservationStatus;
}
