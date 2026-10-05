export type UserRole = 'HUESPED' | 'ADMIN' | 'RECEPCION';

export type RoomType = 'SENCILLA' | 'DOBLE' | 'SUITE';

export type RoomStatus = 'ACTIVA' | 'MANTENIMIENTO' | 'LIMPIEZA' | 'ELIMINADA';

export type ReservationStatus =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'FINALIZADA';

export interface Tag {
  id: string;
  nombre: string;
  descripcion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomImage {
  id: string;
  habitacion_id: string;
  ruta_original: string;
  ruta_web: string;
  ruta_miniatura: string;
  nombre_original: string;
  tamano_original_bytes: number;
  tipo_mime: string;
  es_principal: boolean;
  orden: number;
  url_original: string;
  url_web: string;
  url_miniatura: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: string;
  numero: string;
  tipo: RoomType;
  precio_noche: number;
  estado: RoomStatus;
  imagenes?: RoomImage[];
  descripcion?: string;
  amenidades?: string[];
  etiquetas?: Tag[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Modelo: Servicio Adicional (Leaf en Patrón Composite)
// ---------------------------------------------------------------------------
export interface ServicioAdicional {
  id: string;
  nombre: string;
  precio: number | string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  PaqueteServicio?: {
    cantidad: number;
  };
  cantidad?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Alias para compatibilidad con implementaciones existentes
export type Servicio = ServicioAdicional;

// ---------------------------------------------------------------------------
// Modelo: Paquete Turístico (Composite en Patrón Composite)
// ---------------------------------------------------------------------------
export interface Paquete {
  id: string;
  nombre: string;
  descripcion?: string | null;
  descuento_porcentaje: number | string;
  estado: 'ACTIVO' | 'INACTIVO';
  servicios?: ServicioAdicional[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Desglose del Patrón Composite para cotizaciones y vista de paquetes
// ---------------------------------------------------------------------------
export interface DesgloseComponente {
  tipo: 'SERVICIO_INDIVIDUAL' | 'PAQUETE_COMPUESTO' | 'HOSPEDAJE_ITEM';
  servicio_id?: string | null;
  paquete_id?: string | null;
  nombre: string;
  precio_unitario?: number;
  cantidad?: number;
  descripcion?: string;
  subtotal?: number;
  subtotal_bruto?: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  total_neto?: number;
  total_items?: number;
  componentes?: DesgloseComponente[];
}

export interface PaqueteConDesglose {
  paquete: Paquete;
  composite_desglose?: DesgloseComponente;
}

export interface Acompanante {
  id: string;
  cliente_id: string;
  reserva_id?: string | null;
  documento?: string | null;
  nombre: string;
  parentesco?: string | null;
  telefono?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cliente {
  id: string;
  documento: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  acompanantes?: Acompanante[];
  reservaciones?: Reservation[];
  reservaciones_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reservation {
  id: string;
  cliente_id?: string | null;
  usuario_id?: string | null;
  habitacion_id: string;
  paquete_id?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  precio_total: number;
  estado: ReservationStatus;
  metodo_pago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  tipo_reserva?: 'INMEDIATA' | 'ANTICIPADA';
  es_prorroga?: boolean;
  anticipo?: number;
  observaciones_recepcion?: string | null;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
  habitacion?: Room;
  cliente?: Cliente;
  acompanantes?: Acompanante[];
  usuario?: User;
  paquete?: Paquete;
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
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface RoomAvailabilityParams {
  fecha_inicio: string;
  fecha_fin: string;
}

export interface CreateReservationPayload {
  habitacion_id: string;
  cliente_id?: string;
  cliente_datos?: {
    documento: string;
    nombre: string;
    email: string;
    telefono?: string;
  };
  acompanantes?: Array<{
    nombre: string;
    documento?: string;
    parentesco?: string;
    telefono?: string;
  }>;
  usuario_id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  paquete_id?: string | null;
  precio_total?: number;
  metodo_pago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  tipo_reserva?: 'INMEDIATA' | 'ANTICIPADA';
  es_prorroga?: boolean;
  anticipo?: number;
  observaciones_recepcion?: string | null;
}

export interface UpdateRoomPayload {
  numero?: string;
  tipo?: RoomType;
  precio_noche?: number;
  estado?: RoomStatus;
  descripcion?: string;
  tag_ids?: string[];
}

export interface CreateRoomPayload {
  numero: string;
  tipo: RoomType;
  precio_noche: number;
  descripcion: string;
  tag_ids?: string[];
}

export interface UpdateReservationStatusPayload {
  estado: ReservationStatus;
}

export interface CreateTagPayload {
  nombre: string;
  descripcion?: string;
}

export interface UpdateTagPayload {
  nombre?: string;
  descripcion?: string | null;
}

export interface ClientListItem {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  createdAt?: string;
  updatedAt?: string;
  reservaciones_count: number;
  ingreso_total: number | null;
  ultima_reserva_fecha: string | null;
  ultima_reserva_estado: ReservationStatus | null;
}

export interface UpdateUserPayload {
  nombre?: string;
  email?: string;
  rol?: UserRole;
}

export type UploadImageProgressCb = (file: File, percent: number) => void;

