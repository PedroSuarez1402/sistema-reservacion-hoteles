'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bed,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Gift,
  Hotel,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  RecepcionBookingModal,
  useToast,
} from '@/components';
import {
  formatCurrency,
  formatDate,
  getTodayIso,
  roomTypeLabels,
} from '@/lib/utils';
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from '@/lib/whatsapp';
import {
  useAllReservations,
  usePackages,
  useRooms,
  useUpdateRoomStatus,
} from '@/hooks';
import type { Paquete, Reservation, Room, RoomStatus } from '@/types';

type FilterTab = 'TODAS' | 'DISPONIBLE' | 'OCUPADA' | 'LIMPIEZA' | 'MANTENIMIENTO';

export default function RackHabitacionesPage() {
  const toast = useToast();
  const todayIso = getTodayIso();

  // Queries
  const { data: rooms = [], isLoading: roomsLoading, refetch: refetchRooms } = useRooms();
  const { data: reservations = [], isLoading: reservationsLoading, refetch: refetchReservations } = useAllReservations();
  const { data: packages = [] } = usePackages();

  // Mutation para cambiar estado físico de la habitación (Limpieza, Activa, Mantenimiento)
  const updateStatusMutation = useUpdateRoomStatus();

  // Modales
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = React.useState<Room | null>(null);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<FilterTab>('TODAS');

  // Mapa de paquetes por id para enriquecer información
  const packageById = React.useMemo(() => {
    const map: Record<string, Paquete> = {};
    for (const p of packages) {
      map[p.id] = p;
    }
    return map;
  }, [packages]);

  // Encontrar la reservación que actualmente ocupa cada habitación hoy
  // Una reserva ocupa la habitación hoy si:
  // - habitacion_id coincide
  // - estado está activo ('CONFIRMADA' o 'PENDIENTE')
  // - fecha_inicio <= today && fecha_fin > today
  const activeReservationByRoomId = React.useMemo(() => {
    const map: Record<string, Reservation> = {};
    for (const res of reservations) {
      if (res.estado === 'CANCELADA' || res.estado === 'FINALIZADA') continue;
      if (!res.habitacion_id || !res.fecha_inicio || !res.fecha_fin) continue;

      const start = res.fecha_inicio.slice(0, 10);
      const end = res.fecha_fin.slice(0, 10);

      if (start <= todayIso && end > todayIso) {
        map[res.habitacion_id] = res;
      }
    }
    return map;
  }, [reservations, todayIso]);

  // Próxima reserva para habitaciones libres
  const nextReservationByRoomId = React.useMemo(() => {
    const map: Record<string, Reservation> = {};
    for (const res of reservations) {
      if (res.estado === 'CANCELADA' || res.estado === 'FINALIZADA') continue;
      if (!res.habitacion_id || !res.fecha_inicio) continue;

      const start = res.fecha_inicio.slice(0, 10);
      if (start > todayIso) {
        if (!map[res.habitacion_id] || start < map[res.habitacion_id].fecha_inicio.slice(0, 10)) {
          map[res.habitacion_id] = res;
        }
      }
    }
    return map;
  }, [reservations, todayIso]);

  // Categorizar habitaciones con su estado operacional actual
  const roomBoardItems = React.useMemo(() => {
    return rooms
      .filter((r) => r.estado !== 'ELIMINADA')
      .map((room) => {
        const currentReservation = activeReservationByRoomId[room.id] || null;
        const nextReservation = nextReservationByRoomId[room.id] || null;

        // Determinar estado operacional:
        // 1. Si físicamente está en LIMPIEZA -> 'LIMPIEZA'
        // 2. Si físicamente está en MANTENIMIENTO -> 'MANTENIMIENTO'
        // 3. Si tiene reserva activa hoy -> 'OCUPADA'
        // 4. Si físicamente está en ACTIVA sin reserva hoy -> 'DISPONIBLE'
        let operacional: 'DISPONIBLE' | 'OCUPADA' | 'LIMPIEZA' | 'MANTENIMIENTO';

        if (room.estado === 'LIMPIEZA') {
          operacional = 'LIMPIEZA';
        } else if (room.estado === 'MANTENIMIENTO') {
          operacional = 'MANTENIMIENTO';
        } else if (currentReservation) {
          operacional = 'OCUPADA';
        } else {
          operacional = 'DISPONIBLE';
        }

        return {
          room,
          operacional,
          currentReservation,
          nextReservation,
        };
      });
  }, [rooms, activeReservationByRoomId, nextReservationByRoomId]);

  // Métricas de conteo
  const metrics = React.useMemo(() => {
    const total = roomBoardItems.length;
    let disponibles = 0;
    let ocupadas = 0;
    let limpieza = 0;
    let mantenimiento = 0;

    for (const item of roomBoardItems) {
      if (item.operacional === 'DISPONIBLE') disponibles++;
      else if (item.operacional === 'OCUPADA') ocupadas++;
      else if (item.operacional === 'LIMPIEZA') limpieza++;
      else if (item.operacional === 'MANTENIMIENTO') mantenimiento++;
    }

    return { total, disponibles, ocupadas, limpieza, mantenimiento };
  }, [roomBoardItems]);

  // Filtrado por tab y texto de búsqueda
  const filteredItems = React.useMemo(() => {
    return roomBoardItems.filter((item) => {
      // Filtro por pestaña
      if (activeTab !== 'TODAS' && item.operacional !== activeTab) {
        return false;
      }

      // Filtro por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const numMatch = item.room.numero.toLowerCase().includes(query);
        const tipoMatch = (roomTypeLabels[item.room.tipo] || item.room.tipo)
          .toLowerCase()
          .includes(query);
        const guestNameMatch =
          item.currentReservation?.cliente?.nombre?.toLowerCase().includes(query) ||
          item.currentReservation?.usuario?.nombre?.toLowerCase().includes(query) ||
          false;
        const guestDocMatch =
          item.currentReservation?.cliente?.documento?.toLowerCase().includes(query) || false;
        const acompMatch =
          item.currentReservation?.acompanantes?.some(
            (a) =>
              a.nombre.toLowerCase().includes(query) ||
              (a.documento && a.documento.toLowerCase().includes(query))
          ) || false;

        return numMatch || tipoMatch || guestNameMatch || guestDocMatch || acompMatch;
      }

      return true;
    });
  }, [roomBoardItems, activeTab, searchTerm]);

  // Cambiar estado operacional de la habitación (Limpieza, Activa, Mantenimiento)
  async function handleChangeRoomStatus(roomId: string, newStatus: RoomStatus, roomNum: string) {
    try {
      await updateStatusMutation.mutateAsync({ id: roomId, estado: newStatus });
      const statusLabel =
        newStatus === 'LIMPIEZA'
          ? 'En Limpieza'
          : newStatus === 'ACTIVA'
            ? 'Activa / Disponible'
            : 'En Mantenimiento';
      toast.success(
        'Estado de Habitación Actualizado',
        `Habitación ${roomNum} ahora está marcada como "${statusLabel}".`
      );
      await refetchRooms();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'No se pudo actualizar el estado de la habitación';
      toast.error('Error al actualizar estado', msg);
    }
  }

  // Abrir modal de reserva preseleccionando la habitación
  function handleOpenBookingForRoom(room: Room) {
    setSelectedRoomForBooking(room);
    setBookingModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Rack de Habitaciones
            </h1>
            <Badge className="bg-primary-50 text-primary-700 border-primary-200">
              Control de Ocupación
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Vista en vivo del estado de cada habitación, huéspedes alojados, paquetes turísticos asignados y asignación de limpieza.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            onClick={() => {
              setSelectedRoomForBooking(null);
              setBookingModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Registrar Reserva
          </Button>
        </div>
      </div>

      {/* KPI Cards: Resumen de Ocupación */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <Card
          onClick={() => setActiveTab('TODAS')}
          className={`cursor-pointer transition-all border ${activeTab === 'TODAS'
            ? 'ring-2 ring-primary-500 border-primary-300 bg-primary-50/30'
            : 'hover:border-slate-300 bg-white'
            }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Habitaciones</span>
              <Hotel className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.total}</div>
            <p className="mt-1 text-xs text-slate-400">Capacidad total</p>
          </CardContent>
        </Card>

        {/* Disponibles */}
        <Card
          onClick={() => setActiveTab('DISPONIBLE')}
          className={`cursor-pointer transition-all border ${activeTab === 'DISPONIBLE'
            ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/40'
            : 'hover:border-emerald-300 bg-white'
            }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <span>Disponibles Hoy</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{metrics.disponibles}</div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Listas para walk-in o reserva
            </p>
          </CardContent>
        </Card>

        {/* Ocupadas */}
        <Card
          onClick={() => setActiveTab('OCUPADA')}
          className={`cursor-pointer transition-all border ${activeTab === 'OCUPADA'
            ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/40'
            : 'hover:border-blue-300 bg-white'
            }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-blue-700">
              <span>Ocupadas</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700">{metrics.ocupadas}</div>
            <p className="mt-1 text-xs text-blue-600 font-medium">Huéspedes en estancia</p>
          </CardContent>
        </Card>

        {/* En Limpieza */}
        <Card
          onClick={() => setActiveTab('LIMPIEZA')}
          className={`cursor-pointer transition-all border ${activeTab === 'LIMPIEZA'
            ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/40'
            : 'hover:border-amber-300 bg-white'
            }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-700">
              <span>En Limpieza</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700">{metrics.limpieza}</div>
            <p className="mt-1 text-xs text-amber-600 font-medium">Camarería en proceso</p>
          </CardContent>
        </Card>

        {/* Mantenimiento */}
        <Card
          onClick={() => setActiveTab('MANTENIMIENTO')}
          className={`cursor-pointer transition-all border ${activeTab === 'MANTENIMIENTO'
            ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/40'
            : 'hover:border-rose-300 bg-white'
            }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-rose-700">
              <span>Mantenimiento</span>
              <Wrench className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">{metrics.mantenimiento}</div>
            <p className="mt-1 text-xs text-rose-600 font-medium">Fuera de servicio</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        {/* Pestañas de estado rápido */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'TODAS', label: `Todas (${metrics.total})` },
              { key: 'DISPONIBLE', label: `Disponibles (${metrics.disponibles})` },
              { key: 'OCUPADA', label: `Ocupadas (${metrics.ocupadas})` },
              { key: 'LIMPIEZA', label: `En Limpieza (${metrics.limpieza})` },
              { key: 'MANTENIMIENTO', label: `Mantenimiento (${metrics.mantenimiento})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Búsqueda */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por #, huésped o acompañante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Grid del Rack de Habitaciones */}
      {roomsLoading || reservationsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <Hotel className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">
            No se encontraron habitaciones
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchTerm
              ? `No hay habitaciones que coincidan con "${searchTerm}".`
              : 'No hay habitaciones con el filtro seleccionado.'}
          </p>
          {(searchTerm || activeTab !== 'TODAS') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setActiveTab('TODAS');
              }}
              className="mt-4"
            >
              Restablecer filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map(({ room, operacional, currentReservation, nextReservation }) => {
            // Resolver paquete turístico de la reserva
            const paquete =
              currentReservation?.paquete ||
              (currentReservation?.paquete_id ? packageById[currentReservation.paquete_id] : null);

            // Huésped principal
            const huespedNombre =
              currentReservation?.cliente?.nombre ||
              currentReservation?.usuario?.nombre ||
              'Huésped no especificado';
            const huespedDoc = currentReservation?.cliente?.documento;
            const huespedTel = currentReservation?.cliente?.telefono;
            const huespedEmail =
              currentReservation?.cliente?.email || currentReservation?.usuario?.email;

            // Acompañantes
            const acompanantes = currentReservation?.acompanantes || [];

            // Datos financieros
            const precioTotal = Number(currentReservation?.precio_total || 0);
            const anticipo = Number(currentReservation?.anticipo || 0);
            const saldoPendiente = Math.max(0, +(precioTotal - anticipo).toFixed(2));

            // Estilos del borde y cabecera según el estado
            const cardStyles =
              operacional === 'DISPONIBLE'
                ? 'border-emerald-200 hover:border-emerald-300 shadow-sm'
                : operacional === 'OCUPADA'
                  ? 'border-blue-200 hover:border-blue-300 shadow-sm'
                  : operacional === 'LIMPIEZA'
                    ? 'border-amber-300 bg-amber-50/20 shadow-sm'
                    : 'border-rose-300 bg-rose-50/20 shadow-sm';

            return (
              <div
                key={room.id}
                className={`flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-150 ${cardStyles}`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                        Hab. {room.numero}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {roomTypeLabels[room.tipo] || room.tipo}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                      {formatCurrency(Number(room.precio_noche))} USD / noche
                    </p>
                  </div>

                  {/* Badge de Estado Operacional */}
                  <div>
                    {operacional === 'DISPONIBLE' && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Disponible
                      </Badge>
                    )}
                    {operacional === 'OCUPADA' && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1 font-semibold">
                        <Bed className="h-3 w-3" />
                        Ocupada
                      </Badge>
                    )}
                    {operacional === 'LIMPIEZA' && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1 font-semibold">
                        <Sparkles className="h-3 w-3" />
                        En Limpieza
                      </Badge>
                    )}
                    {operacional === 'MANTENIMIENTO' && (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-300 flex items-center gap-1 font-semibold">
                        <Wrench className="h-3 w-3" />
                        Mantenimiento
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Cuerpo de la Tarjeta */}
                <div className="p-4 flex-1 space-y-4">
                  {/* CASO 1: HABITACIÓN OCUPADA */}
                  {operacional === 'OCUPADA' && currentReservation && (
                    <div className="space-y-3.5">
                      {/* Datos del Huésped Titular */}
                      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            Huésped Titular
                          </span>
                          {currentReservation.estado && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {currentReservation.estado}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">
                            {huespedNombre}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            {huespedDoc && (
                              <span className="font-medium text-slate-700">
                                Doc: {huespedDoc}
                              </span>
                            )}
                            {huespedTel && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">Tel: {huespedTel}</span>
                                <a
                                  href={buildWhatsAppUrl(
                                    `Hola ${huespedNombre}, le escribimos desde la recepción del hotel.`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-0.5"
                                  title="Contactar por WhatsApp"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                          {huespedEmail && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {huespedEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lista de Acompañantes */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            Acompañantes ({acompanantes.length})
                          </span>
                        </div>

                        {acompanantes.length > 0 ? (
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {acompanantes.map((ac, idx) => (
                              <div
                                key={ac.id || idx}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                              >
                                <span className="font-medium text-slate-800 truncate">
                                  {ac.nombre}
                                </span>
                                <span className="text-[11px] text-slate-500 shrink-0 ml-2">
                                  {ac.parentesco || 'Acompañante'}
                                  {ac.documento ? ` · ${ac.documento}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Sin acompañantes adicionales registrados.
                          </p>
                        )}
                      </div>

                      {/* Información de la Reserva y Plan Turístico */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                        {/* Fechas de Estancia */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Estancia:</span>
                          <span className="font-semibold text-slate-800">
                            {formatDate(currentReservation.fecha_inicio)} →{' '}
                            {formatDate(currentReservation.fecha_fin)}
                          </span>
                        </div>

                        {/* Plan Turístico Asignado */}
                        <div className="space-y-1 border-t border-slate-200/70 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                              <Gift className="h-3.5 w-3.5 text-primary-600" />
                              Plan Turístico Asignado
                            </span>
                            {paquete && Number(paquete.descuento_porcentaje) > 0 && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5">
                                -{paquete.descuento_porcentaje}% dto
                              </Badge>
                            )}
                          </div>

                          {paquete ? (
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-slate-900">
                                {paquete.nombre}
                              </p>
                              {paquete.servicios && paquete.servicios.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {paquete.servicios.map((srv) => (
                                    <span
                                      key={srv.id}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                                    >
                                      ✓ {srv.nombre}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500">
                                  Paquete sin servicios específicos detallados.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              Solo Hospedaje (Sin paquete turístico adicional).
                            </p>
                          )}
                        </div>

                        {/* Resumen de Liquidación */}
                        <div className="border-t border-slate-200/70 pt-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Total Cuenta:</span>
                            <strong className="text-slate-900 font-bold">
                              {formatCurrency(precioTotal)} USD
                            </strong>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px]">Saldo Pendiente:</span>
                            <strong
                              className={`font-bold ${saldoPendiente > 0 ? 'text-amber-700' : 'text-emerald-600'
                                }`}
                            >
                              {saldoPendiente > 0
                                ? `${formatCurrency(saldoPendiente)} USD`
                                : 'Pagado Total'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASO 2: HABITACIÓN DISPONIBLE */}
                  {operacional === 'DISPONIBLE' && (
                    <div className="space-y-3 py-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center space-y-1.5">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <h4 className="text-sm font-bold text-emerald-900">
                          Habitación Lista y Disponible
                        </h4>
                        <p className="text-xs text-emerald-700">
                          Apta para registro inmediato (walk-in) o reservación anticipada.
                        </p>
                      </div>

                      {nextReservation && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            Próxima llegada:
                          </span>
                          <span className="font-semibold text-slate-700">
                            {formatDate(nextReservation.fecha_inicio)}
                          </span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleOpenBookingForRoom(room)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Registrar Reserva en Esta Habitación
                      </Button>
                    </div>
                  )}

                  {/* CASO 3: HABITACIÓN EN LIMPIEZA */}
                  {operacional === 'LIMPIEZA' && (
                    <div className="space-y-3 py-2">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center space-y-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-amber-900">
                            En Proceso de Limpieza
                          </h4>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Asignada a camarería para aseo, cambio de lencería y desinfección.
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleChangeRoomStatus(room.id, 'ACTIVA', room.numero)}
                        loading={updateStatusMutation.isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      >
                        ✓ Marcar como Limpia y Disponible
                      </Button>
                    </div>
                  )}

                  {/* CASO 4: HABITACIÓN EN MANTENIMIENTO */}
                  {operacional === 'MANTENIMIENTO' && (
                    <div className="space-y-3 py-2">
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center space-y-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                          <Wrench className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-rose-900">
                            Fuera de Servicio por Mantenimiento
                          </h4>
                          <p className="text-xs text-rose-700 mt-0.5">
                            En reparación o revisión técnica. No disponible para reservas.
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleChangeRoomStatus(room.id, 'ACTIVA', room.numero)}
                        loading={updateStatusMutation.isPending}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold"
                        leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      >
                        Habilitar Habitación (Fin Mantenimiento)
                      </Button>
                    </div>
                  )}
                </div>

                {/* Pie de la Tarjeta: Acciones Rápidas de Operación y Limpieza */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                  {/* Botón de Asignar Limpieza */}
                  {operacional !== 'LIMPIEZA' && (
                    <button
                      type="button"
                      onClick={() => handleChangeRoomStatus(room.id, 'LIMPIEZA', room.numero)}
                      disabled={updateStatusMutation.isPending}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-lg px-2.5 py-1.5 transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Asignar Limpieza
                    </button>
                  )}

                  {/* Si ya está en limpieza, botón para enviar a mantenimiento */}
                  {operacional === 'LIMPIEZA' && (
                    <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Aseo en curso
                    </span>
                  )}

                  {/* Alternar Mantenimiento */}
                  <div className="ml-auto">
                    {operacional !== 'MANTENIMIENTO' ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleChangeRoomStatus(room.id, 'MANTENIMIENTO', room.numero)
                        }
                        disabled={updateStatusMutation.isPending}
                        className="text-xs text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                        title="Marcar avería o mantenimiento"
                      >
                        <Wrench className="h-3 w-3" />
                        Mantenimiento
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleChangeRoomStatus(room.id, 'LIMPIEZA', room.numero)}
                        disabled={updateStatusMutation.isPending}
                        className="text-xs text-amber-700 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Enviar a Limpieza
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Reserva Asistida con Habitación Preseleccionada */}
      {bookingModalOpen && (
        <RecepcionBookingModal
          open={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedRoomForBooking(null);
          }}
          preselectedRoom={selectedRoomForBooking}
          onSuccess={async () => {
            await refetchRooms();
            await refetchReservations();
          }}
        />
      )}
    </div>
  );
}
