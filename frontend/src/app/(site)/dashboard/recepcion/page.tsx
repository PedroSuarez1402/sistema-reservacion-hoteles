'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Hotel,
  LogOut,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  User,
  Users,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CheckInModal,
  Dialog,
  EditarReservaModal,
  Input,
  RecepcionBookingModal,
  useToast,
} from '@/components';
import {
  formatCurrency,
  formatDate,
  getTodayIso,
  reservationStatusStyles,
  roomTypeLabels,
} from '@/lib/utils';
import {
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from '@/lib/whatsapp';
import { useAllReservations, useRooms } from '@/hooks';

function calculateDaysDifference(fromIso: string, toIso: string): number {
  if (!fromIso || !toIso) return 0;
  const [y1, m1, d1] = fromIso.substring(0, 10).split('-').map(Number);
  const [y2, m2, d2] = toIso.substring(0, 10).split('-').map(Number);
  const dateFrom = new Date(y1, m1 - 1, d1);
  const dateTo = new Date(y2, m2 - 1, d2);
  const diffMs = dateTo.getTime() - dateFrom.getTime();
  return Math.round(diffMs / 86400000);
}
import reservationService, {
  checkInReservation,
  checkOutReservation,
  noShowReservation,
  prorrogaReservation,
} from '@/services/reservation.service';
import type { Reservation, ReservationStatus, Room } from '@/types';

export default function RecepcionDashboardPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const todayIso = getTodayIso();

  // Queries
  const { data: reservations = [], isLoading: reservationsLoading } = useAllReservations();
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();

  // Modal states
  const [assistedBookingOpen, setAssistedBookingOpen] = React.useState(false);
  const [prorrogaModalOpen, setProrrogaModalOpen] = React.useState(false);
  const [selectedReserva, setSelectedReserva] = React.useState<Reservation | null>(null);
  const [prorrogaMotivo, setProrrogaMotivo] = React.useState('');
  const [prorrogaNuevaFechaFin, setProrrogaNuevaFechaFin] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  // Check-in y Edición modal states
  const [checkInModalOpen, setCheckInModalOpen] = React.useState(false);
  const [selectedCheckInReserva, setSelectedCheckInReserva] = React.useState<Reservation | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedEditReserva, setSelectedEditReserva] = React.useState<Reservation | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('TODAS');
  const [metodoFilter, setMetodoFilter] = React.useState<string>('TODOS');

  // Daily Metrics
  const activeRooms = React.useMemo(() => rooms.filter((r) => r.estado === 'ACTIVA'), [rooms]);

  // Mapa de habitaciones por ID para resolver la relación desacoplada
  const roomById = React.useMemo(() => {
    const map: Record<string, Room> = {};
    for (const rm of rooms) {
      map[rm.id] = rm;
    }
    return map;
  }, [rooms]);

  // Reservaciones enriquecidas con la información de habitación correspondiente
  const enrichedReservations = React.useMemo(() => {
    return reservations.map((r) => {
      const room = roomById[r.habitacion_id];
      return {
        ...r,
        habitacion: room || r.habitacion,
      };
    });
  }, [reservations, roomById]);

  // Habitaciones ocupadas hoy (reservas activas donde hoy está en el rango de fechas)
  const ocupadasHoyCount = React.useMemo(() => {
    return enrichedReservations.filter((r) => {
      if (r.estado !== 'CONFIRMADA') return false;
      return r.fecha_inicio <= todayIso && r.fecha_fin >= todayIso;
    }).length;
  }, [enrichedReservations, todayIso]);

  const libresHoyCount = Math.max(0, activeRooms.length - ocupadasHoyCount);
  const porcentajeOcupacion = activeRooms.length > 0
    ? Math.round((ocupadasHoyCount / activeRooms.length) * 100)
    : 0;

  // Recaudación de hoy desglosada por método de pago
  const recaudacionHoy = React.useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;
    let tarjeta = 0;

    for (const r of enrichedReservations) {
      // Tomamos reservas registradas hoy o anticipos/totales cobrados
      const createdDate = r.createdAt ? r.createdAt.substring(0, 10) : '';
      const esHoy = createdDate === todayIso || r.fecha_inicio === todayIso;

      if (esHoy && r.estado !== 'CANCELADA') {
        const monto = Number(r.anticipo) > 0 ? Number(r.anticipo) : Number(r.precio_total);
        if (r.metodo_pago === 'TRANSFERENCIA') {
          transferencia += monto;
        } else if (r.metodo_pago === 'TARJETA') {
          tarjeta += monto;
        } else {
          efectivo += monto;
        }
      }
    }

    return {
      efectivo,
      transferencia,
      tarjeta,
      total: efectivo + transferencia + tarjeta,
    };
  }, [enrichedReservations, todayIso]);

  // Filtrado de Reservaciones
  const filteredReservations = React.useMemo(() => {
    return enrichedReservations.filter((r) => {
      // Estado
      if (statusFilter !== 'TODAS') {
        if (statusFilter === 'PRORROGA') {
          if (!r.es_prorroga) return false;
        } else if (r.estado !== statusFilter) {
          return false;
        }
      }

      // Método de Pago
      if (metodoFilter !== 'TODOS' && r.metodo_pago !== metodoFilter) {
        return false;
      }

      // Búsqueda por texto (Cliente, documento, acompañantes, habitación, email)
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const clientName = (r.cliente?.nombre || r.usuario?.nombre || '').toLowerCase();
        const clientEmail = (r.cliente?.email || r.usuario?.email || '').toLowerCase();
        const clientDoc = (r.cliente?.documento || '').toLowerCase();
        const acompNames = (r.acompanantes || []).map((a) => a.nombre.toLowerCase()).join(' ');
        const roomNum = (r.habitacion?.numero || '').toLowerCase();
        const obs = (r.observaciones_recepcion || '').toLowerCase();

        return (
          clientName.includes(term) ||
          clientEmail.includes(term) ||
          clientDoc.includes(term) ||
          acompNames.includes(term) ||
          roomNum.includes(term) ||
          obs.includes(term)
        );
      }

      return true;
    });
  }, [enrichedReservations, statusFilter, metodoFilter, searchTerm]);

  // Transiciones de Estado
  async function handleCheckIn(reserva: Reservation) {
    try {
      setActionLoading(true);
      await checkInReservation(reserva.id, {
        observaciones: 'Check-in realizado en recepción',
      });
      const clienteNombre = reserva.cliente?.nombre || reserva.usuario?.nombre || 'El cliente';
      toast.success(
        'Check-in Confirmado',
        `El cliente ${clienteNombre} ha ingresado a la habitación.`
      );
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Error al realizar check-in';
      toast.error('Error en check-in', msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut(reserva: Reservation) {
    try {
      setActionLoading(true);
      await checkOutReservation(reserva.id, {
        observaciones: 'Check-out completado. Habitación liberada.',
      });
      toast.success(
        'Check-out Exitoso',
        `Reserva finalizada para la habitación ${reserva.habitacion?.numero || ''}.`
      );
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Error al realizar check-out';
      toast.error('Error en check-out', msg);
    } finally {
      setActionLoading(false);
    }
  }

  function openProrrogaModal(reserva: Reservation) {
    setSelectedReserva(reserva);
    setProrrogaMotivo('');
    setProrrogaNuevaFechaFin('');
    setProrrogaModalOpen(true);
  }

  function openCheckInModal(reserva: Reservation) {
    setSelectedCheckInReserva(reserva);
    setCheckInModalOpen(true);
  }

  function openEditModal(reserva: Reservation) {
    setSelectedEditReserva(reserva);
    setEditModalOpen(true);
  }

  async function handleConfirmProrroga() {
    if (!selectedReserva) return;
    try {
      setActionLoading(true);
      await prorrogaReservation(selectedReserva.id, {
        motivo: prorrogaMotivo || 'Retraso avisado por el cliente a recepción',
        nueva_fecha_fin: prorrogaNuevaFechaFin || undefined,
      });
      const clienteNombre = selectedReserva.cliente?.nombre || selectedReserva.usuario?.nombre || 'el cliente';
      toast.success(
        'Prórroga Registrada',
        `Se marcó la prórroga para la reserva de ${clienteNombre}.`
      );
      setProrrogaModalOpen(false);
      setSelectedReserva(null);
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Error al registrar prórroga';
      toast.error('Error en prórroga', msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleNoShow(reserva: Reservation) {
    const clienteNombre = reserva.cliente?.nombre || reserva.usuario?.nombre || 'este cliente';
    const confirm = window.confirm(
      `¿Deseas marcar como No-Show la reserva de ${clienteNombre}? Esta acción cancelará la reserva.`
    );
    if (!confirm) return;

    try {
      setActionLoading(true);
      await noShowReservation(reserva.id, {
        observaciones: 'Cancelado por No-Show sin preaviso en recepción',
      });
      toast.warning(
        'Reserva marcada como No-Show',
        `La reserva fue cancelada y la habitación ${reserva.habitacion?.numero || ''} queda libre.`
      );
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Error al marcar No-Show';
      toast.error('Error en No-Show', msg);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Principal con Botón Destacado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-600/30">
              <Hotel className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Consola de Recepción
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              En Vivo
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Control de reservas asistidas, check-in, check-out, prórrogas y cobros en mostrador o WhatsApp.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setAssistedBookingOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-semibold"
          leftIcon={<Plus className="h-5 w-5" />}
        >
          Registrar Reserva
        </Button>
      </div>

      {/* Métricas del Día (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Habitaciones Libres vs Ocupadas */}
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ocupación Hoy
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Hotel className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{ocupadasHoyCount}</span>
              <span className="text-xs text-slate-500">
                / {activeRooms.length} habitaciones ({porcentajeOcupacion}%)
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{libresHoyCount} habitaciones libres para hoy</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI: Recaudado Hoy en Efectivo */}
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recaudado en Efectivo
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">
                {formatCurrency(recaudacionHoy.efectivo)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Cobros físicos en mostrador hoy</p>
          </CardContent>
        </Card>

        {/* KPI: Recaudado Hoy en Transferencia */}
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Transferencia (Nequi/Bancos)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-700">
                {formatCurrency(recaudacionHoy.transferencia)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Transferencias / WhatsApp hoy</p>
          </CardContent>
        </Card>

        {/* KPI: Total Recaudado Hoy */}
        <Card className="border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Total Recaudado Hoy
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">
                {formatCurrency(recaudacionHoy.total)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Tarjeta: {formatCurrency(recaudacionHoy.tarjeta)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        {/* Input de Búsqueda */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por huésped, documento, habitación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>

        {/* Filtros de Estado y Pago */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector Estado */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
            {[
              { id: 'TODAS', label: 'Todas' },
              { id: 'PENDIENTE', label: 'Pendientes' },
              { id: 'CONFIRMADA', label: 'En Estancia' },
              { id: 'PRORROGA', label: 'Prórrogas' },
              { id: 'FINALIZADA', label: 'Finalizadas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selector Método Pago */}
          <select
            value={metodoFilter}
            onChange={(e) => setMetodoFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="TODOS">Todos los Métodos</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
          </select>
        </div>
      </div>

      {/* Tabla de Reservaciones Activas y Acciones */}
      <Card className="border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Huésped</th>
                <th className="px-4 py-3.5">Habitación</th>
                <th className="px-4 py-3.5">Fechas</th>
                <th className="px-4 py-3.5">Liquidación / Pago</th>
                <th className="px-4 py-3.5">Tipo & Estado</th>
                <th className="px-4 py-3.5">Observaciones</th>
                <th className="px-4 py-3.5 text-right">Acciones de Recepción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reservationsLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Cargando reservaciones del hotel...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No se encontraron reservaciones con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((r) => {
                  const statusStyle = reservationStatusStyles[r.estado] || {
                    label: r.estado,
                    className: 'bg-slate-100 text-slate-700',
                  };
                  const clientObj = r.cliente || r.usuario;
                  const guestName = clientObj?.nombre || 'Cliente sin asignar';
                  const guestEmail = clientObj?.email || '';
                  const guestDoc = r.cliente?.documento;
                  const acompanantes = r.acompanantes || [];
                  const anticipoVal = Number(r.anticipo) || 0;
                  const totalVal = Number(r.precio_total) || 0;
                  const saldoVal = Math.max(0, +(totalVal - anticipoVal).toFixed(2));

                  const isPendiente = r.estado === 'PENDIENTE';
                  const isConfirmada = r.estado === 'CONFIRMADA';
                  const isFinalizada = r.estado === 'FINALIZADA';
                  const isCancelada = r.estado === 'CANCELADA';

                  const startDate = r.fecha_inicio.substring(0, 10);
                  const endDate = r.fecha_fin.substring(0, 10);
                  const daysUntilArrival = calculateDaysDifference(todayIso, startDate);

                  const hasCheckedIn = Boolean(
                    r.observaciones_recepcion && r.observaciones_recepcion.includes('[Check-in:')
                  );

                  // Reglas de negocio temporales para botones de recepción
                  const canEdit = !isFinalizada && !isCancelada;
                  const canCheckIn = !isFinalizada && !isCancelada && !hasCheckedIn && todayIso >= startDate;
                  const canProrroga = !isFinalizada && !isCancelada && daysUntilArrival <= 2 && todayIso <= endDate;
                  const canCheckOut = !isFinalizada && !isCancelada && (hasCheckedIn || todayIso >= startDate) && todayIso >= endDate;
                  const isFutureArrival = !isFinalizada && !isCancelada && !hasCheckedIn && daysUntilArrival > 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cliente / Huéspedes */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">{guestName}</span>
                            {guestDoc && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                Doc: {guestDoc}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{guestEmail}</span>

                          {/* Acompañantes */}
                          {acompanantes.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-primary-700 font-medium mt-1">
                              <Users className="h-3 w-3 shrink-0" />
                              <span className="shrink-0">
                                +{acompanantes.length} {acompanantes.length === 1 ? 'acompañante' : 'acompañantes'}:
                              </span>
                              <span className="text-slate-500 truncate max-w-[170px]" title={acompanantes.map((a) => `${a.nombre} (${a.parentesco || 'Familiar'})`).join(', ')}>
                                {acompanantes.map((a) => a.nombre).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Habitación */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            Hab. {r.habitacion?.numero || '—'}
                          </span>
                          {r.habitacion?.tipo && (
                            <Badge variant="gray" className="text-[10px] px-1.5 py-0">
                              {roomTypeLabels[r.habitacion.tipo] || r.habitacion.tipo}
                            </Badge>
                          )}
                        </div>
                        {r.paquete && (
                          <span className="text-[11px] text-purple-600 font-medium block truncate max-w-[140px]">
                            🎁 {r.paquete.nombre}
                          </span>
                        )}
                      </td>

                      {/* Fechas */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <div className="font-medium text-slate-800">
                          {formatDate(r.fecha_inicio)}
                        </div>
                        <div className="text-slate-400">hasta {formatDate(r.fecha_fin)}</div>
                      </td>

                      {/* Liquidación / Pago */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${r.metodo_pago === 'TRANSFERENCIA'
                                ? 'bg-purple-100 text-purple-700'
                                : r.metodo_pago === 'TARJETA'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                          >
                            {r.metodo_pago || 'EFECTIVO'}
                          </Badge>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(totalVal)}
                          </span>
                        </div>
                        {saldoVal > 0 ? (
                          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                            Saldo pdte: {formatCurrency(saldoVal)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            ✓ Pagado total
                          </div>
                        )}
                      </td>

                      {/* Tipo & Estado */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={statusStyle.className}>
                            {hasCheckedIn && isConfirmada ? 'En Estancia' : statusStyle.label}
                          </Badge>

                          <div className="flex items-center gap-1 flex-wrap">
                            {r.tipo_reserva === 'INMEDIATA' && (
                              <Badge className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0 border-0">
                                Walk-in
                              </Badge>
                            )}
                            {r.es_prorroga && (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 border-0">
                                Prórroga
                              </Badge>
                            )}
                            {isFutureArrival && (
                              <Badge className="bg-sky-50 text-sky-700 text-[10px] px-1.5 py-0 border-0">
                                Llega en {daysUntilArrival}d
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Observaciones */}
                      <td className="px-4 py-3.5 text-xs max-w-xs">
                        <p className="line-clamp-2 text-slate-600" title={r.observaciones_recepcion || r.notas || ''}>
                          {r.observaciones_recepcion || r.notas || '—'}
                        </p>
                      </td>

                      {/* Acciones de Recepción */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Editar: Disponible en cualquier momento para la recepcionista */}
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => openEditModal(r)}
                              className="text-xs px-2.5 py-1 h-8 text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
                              leftIcon={<Pencil className="h-3 w-3 text-slate-500" />}
                              title="Editar reservación en cualquier momento"
                            >
                              Editar
                            </Button>
                          )}

                          {/* Botón Verde: Check-in (disponible cuando llega la fecha de reservación) */}
                          {canCheckIn && (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={actionLoading}
                              onClick={() => openCheckInModal(r)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 h-8 font-semibold shadow-sm"
                              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                              title="Registrar Check-in y liquidar saldo restante"
                            >
                              Check-in
                            </Button>
                          )}

                          {/* Botón Amarillo: Prórroga (disponible faltando 2 días para la llegada o en estancia) */}
                          {canProrroga && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => openProrrogaModal(r)}
                              className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs px-2.5 py-1 h-8 font-medium"
                              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                              title="Registrar prórroga o extensión de estancia"
                            >
                              Prórroga
                            </Button>
                          )}

                          {/* Botón Azul: Check-out (disponible el día que debe salir de la habitación) */}
                          {canCheckOut && (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={actionLoading}
                              onClick={() => handleCheckOut(r)}
                              className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-2.5 py-1 h-8 font-semibold shadow-sm"
                              leftIcon={<LogOut className="h-3.5 w-3.5" />}
                              title="Completar Check-out y liberar habitación"
                            >
                              Check-out
                            </Button>
                          )}

                          {/* Botón Rojo: No-Show (disponible si ya es la fecha de llegada y no se presentó) */}
                          {!hasCheckedIn && todayIso >= startDate && !isFinalizada && !isCancelada && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading}
                              onClick={() => handleNoShow(r)}
                              className="text-xs px-2 py-1 h-8"
                              leftIcon={<UserX className="h-3.5 w-3.5" />}
                              title="Marcar No-Show"
                            >
                              No-Show
                            </Button>
                          )}

                          {/* Finalizada / Cancelada */}
                          {(isFinalizada || isCancelada) && (
                            <span className="text-xs text-slate-400 italic">Cerrada</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Registrar Reserva Asistida */}
      <RecepcionBookingModal
        open={assistedBookingOpen}
        onClose={() => setAssistedBookingOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }}
      />

      {/* Modal: Check-in y Liquidación de Saldo */}
      <CheckInModal
        open={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        reserva={selectedCheckInReserva}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }}
      />

      {/* Modal: Editar Reservación */}
      <EditarReservaModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        reserva={selectedEditReserva}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }}
      />

      {/* Modal: Prórroga de Estadía */}
      <Dialog
        open={prorrogaModalOpen}
        onClose={() => setProrrogaModalOpen(false)}
        title="Registrar Prórroga de Estadía"
        description={`Registra un retraso o extensión avisada por el huésped ${selectedReserva?.usuario?.nombre || ''}.`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setProrrogaModalOpen(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              loading={actionLoading}
              onClick={handleConfirmProrroga}
            >
              Guardar Prórroga
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Motivo del Retraso / Detalle de la Prórroga *
            </label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Ej: Retraso en vuelo nacional, llegada estimada a las 9:00 PM; o solicita extender 1 noche adicional..."
              value={prorrogaMotivo}
              onChange={(e) => setProrrogaMotivo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Nueva Fecha de Salida (Opcional, si extiende días)
            </label>
            <Input
              type="date"
              min={selectedReserva?.fecha_fin || todayIso}
              value={prorrogaNuevaFechaFin}
              onChange={(e) => setProrrogaNuevaFechaFin(e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
