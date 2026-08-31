'use client';

import * as React from 'react';
import {
  Ban,
  CalendarCheck,
  CalendarPlus2,
  Hotel,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  ReservationTable,
  RoomCard,
  RoomModal,
  useToast,
} from '../../../../components';
import { cn } from '../../../../lib/utils';
import {
  useAllReservations,
  useCancelReservation,
  useCreateRoom,
  useDeleteReservation,
  useDeleteRoom,
  useRooms,
  useUpdateReservationStatus,
  useUpdateRoom,
} from '../../../../hooks';
import { formatCurrency } from '../../../../lib/utils';
import type { CreateRoomPayload, Reservation, ReservationStatus, Room, UpdateRoomPayload } from '../../../../types';

type AdminTab = 'reservaciones' | 'habitaciones';

function ReservationSummary({
  reservations,
}: {
  reservations: Reservation[];
}) {
  const total = reservations.length;
  const pending = reservations.filter((r) => r.estado === 'PENDIENTE').length;
  const confirmed = reservations.filter((r) => r.estado === 'CONFIRMADA').length;
  const canceled = reservations.filter((r) => r.estado === 'CANCELADA').length;
  const revenue = reservations
    .filter((r) => r.estado !== 'CANCELADA')
    .reduce((acc, r) => acc + Number(r.precio_total), 0);

  const cards = [
    {
      label: 'Total reservas',
      value: total.toString(),
      icon: <CalendarCheck className="h-5 w-5 text-primary-600" />,
      tone: 'bg-primary-50 ring-primary-100',
    },
    {
      label: 'Pendientes',
      value: pending.toString(),
      icon: <CalendarPlus2 className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 ring-amber-100',
    },
    {
      label: 'Confirmadas',
      value: confirmed.toString(),
      icon: <Users className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'Ingresos estimados',
      value: formatCurrency(revenue),
      icon: <span className="text-lg">💸</span>,
      tone: 'bg-sky-50 ring-sky-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl p-4 ring-1 ${card.tone}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-white">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomSummary({ rooms }: { rooms: Room[] }) {
  const total = rooms.length;
  const activas = rooms.filter((r) => r.estado === 'ACTIVA').length;
  const mantenimiento = rooms.filter((r) => r.estado === 'MANTENIMIENTO').length;
  const avgPrice =
    total > 0
      ? rooms.reduce((acc, r) => acc + Number(r.precio_noche), 0) / total
      : 0;

  const cards = [
    {
      label: 'Total habitaciones',
      value: total.toString(),
      icon: <Hotel className="h-5 w-5 text-primary-600" />,
      tone: 'bg-primary-50 ring-primary-100',
    },
    {
      label: 'Disponibles (Activas)',
      value: activas.toString(),
      icon: <CalendarCheck className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'En mantenimiento',
      value: mantenimiento.toString(),
      icon: <Ban className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 ring-amber-100',
    },
    {
      label: 'Precio promedio',
      value: formatCurrency(avgPrice),
      icon: <span className="text-lg">📊</span>,
      tone: 'bg-sky-50 ring-sky-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl p-4 ring-1 ${card.tone}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-white">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState<AdminTab>('reservaciones');

  // ----- Reservas
  const reservationsQuery = useAllReservations();
  const cancelMutation = useCancelReservation();
  const statusMutation = useUpdateReservationStatus();
  const deleteReservationMutation = useDeleteReservation();

  const [confirmCancel, setConfirmCancel] = React.useState<Reservation | null>(null);
  const [confirmDeleteReservation, setConfirmDeleteReservation] = React.useState<Reservation | null>(null);

  // ----- Habitaciones
  const roomsQuery = useRooms();
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const deleteRoomMutation = useDeleteRoom();

  const [roomModalOpen, setRoomModalOpen] = React.useState(false);
  const [roomEditing, setRoomEditing] = React.useState<Room | null>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = React.useState<Room | null>(null);

  async function handleStatusChange(id: string, estado: ReservationStatus) {
    try {
      await statusMutation.mutateAsync({ id, payload: { estado } });
      toast.success('Estado actualizado', `La reserva ahora está ${estado.toLowerCase()}`);
      void reservationsQuery.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar';
      toast.error('Error al actualizar estado', message);
    }
  }

  async function confirmCancelReservation() {
    if (!confirmCancel) return;
    try {
      await cancelMutation.mutateAsync(confirmCancel.id);
      toast.success('Reserva cancelada', 'Se actualizó el estado a Cancelada');
      setConfirmCancel(null);
      void reservationsQuery.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cancelar';
      toast.error('Error al cancelar', message);
    }
  }

  async function confirmDeleteReservationHandler() {
    if (!confirmDeleteReservation) return;
    try {
      await deleteReservationMutation.mutateAsync(confirmDeleteReservation.id);
      toast.success('Reserva eliminada', 'La reserva fue eliminada del sistema');
      setConfirmDeleteReservation(null);
      void reservationsQuery.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar';
      toast.error('Error al eliminar reserva', message);
    }
  }

  function openCreateRoom() {
    setRoomEditing(null);
    setRoomModalOpen(true);
  }

  function openEditRoom(room: Room) {
    setRoomEditing(room);
    setRoomModalOpen(true);
  }

  async function handleRoomSubmit(payload: CreateRoomPayload & { id?: string }) {
    try {
      if (payload.id) {
        const { id, ...rest } = payload;
        await updateRoomMutation.mutateAsync({ id, payload: rest as UpdateRoomPayload });
        toast.success('Habitación actualizada', `Habit. ${payload.numero} actualizada correctamente`);
      } else {
        await createRoomMutation.mutateAsync(payload as CreateRoomPayload);
        toast.success('Habitación creada', `Habit. ${payload.numero} agregada al inventario`);
      }
      setRoomModalOpen(false);
      setRoomEditing(null);
      void roomsQuery.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la habitación';
      toast.error('Error al guardar habitación', message);
    }
  }

  async function confirmDeleteRoomHandler() {
    if (!confirmDeleteRoom) return;
    try {
      await deleteRoomMutation.mutateAsync(confirmDeleteRoom.id);
      toast.success('Habitación eliminada', `Habit. ${confirmDeleteRoom.numero} eliminada correctamente`);
      setConfirmDeleteRoom(null);
      void roomsQuery.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la habitación';
      toast.error('Error al eliminar habitación', message);
    }
  }

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'reservaciones',
      label: 'Reservaciones',
      icon: <CalendarCheck className="h-4 w-4" />,
    },
    {
      key: 'habitaciones',
      label: 'Habitaciones',
      icon: <Hotel className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Panel Admin</Badge>
                Administración del Hotel
              </CardTitle>
              <CardDescription>
                Gestiona reservaciones e inventario de habitaciones.
              </CardDescription>
            </div>
            {activeTab === 'habitaciones' ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateRoom}>
                Agregar habitación
              </Button>
            ) : null}
          </div>

          <div className="mt-4 inline-flex rounded-xl bg-slate-100 p-1">
            {tabs.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {activeTab === 'reservaciones' ? (
        <>
          <ReservationSummary reservations={reservationsQuery.data ?? []} />
          <ReservationTable
            reservations={reservationsQuery.data}
            isLoading={reservationsQuery.isLoading}
            isStaff={true}
            showUserColumn={true}
            showRoomInfo={true}
            onCancel={(r) => setConfirmCancel(r)}
            onStatusChange={handleStatusChange}
            onDelete={(r) => setConfirmDeleteReservation(r)}
          />
        </>
      ) : (
        <>
          <RoomSummary rooms={roomsQuery.data ?? []} />
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Inventario de habitaciones
              </h3>
              <p className="text-sm text-slate-500">
                Administra el inventario. Edita precios, tipos y estados.
              </p>
            </div>
            {roomsQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(roomsQuery.data ?? []).map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    displayActions="admin"
                    onEdit={openEditRoom}
                    onDelete={(r) => setConfirmDeleteRoom(r)}
                    isLoading={deleteRoomMutation.isPending}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <RoomModal
        open={roomModalOpen}
        onClose={() => {
          setRoomModalOpen(false);
          setRoomEditing(null);
        }}
        initialValue={roomEditing}
        onSubmit={handleRoomSubmit}
        isLoading={createRoomMutation.isPending || updateRoomMutation.isPending}
        allowStatusEdit={true}
      />

      {/* Cancel reservation dialog */}
      <Dialog
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title="Cancelar reserva"
        description="El cliente será notificado implícitamente al cambiar el estado. Esta acción actualiza el estado a CANCELADA."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(null)}
              disabled={cancelMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={cancelMutation.isPending}
              leftIcon={<Ban className="h-4 w-4" />}
              onClick={confirmCancelReservation}
            >
              Sí, cancelar reserva
            </Button>
          </>
        }
      >
        {confirmCancel ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Reserva #{confirmCancel.id.slice(0, 8)}
            </p>
            <p className="mt-1 text-amber-700">
              Cliente: {confirmCancel.usuario?.nombre ?? confirmCancel.usuario_id.slice(0, 6)} · Hab.{' '}
              {confirmCancel.habitacion?.numero ?? confirmCancel.habitacion_id.slice(0, 6)}
            </p>
            <p className="mt-2 font-semibold text-slate-800">
              Total: {formatCurrency(Number(confirmCancel.precio_total))}
            </p>
          </div>
        ) : null}
      </Dialog>

      {/* Delete reservation dialog */}
      <Dialog
        open={!!confirmDeleteReservation}
        onClose={() => setConfirmDeleteReservation(null)}
        title="Eliminar reserva"
        description="Esta acción elimina definitivamente la reserva de la base de datos. En la mayoría de los casos es mejor cancelarla."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteReservation(null)}
              disabled={deleteReservationMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={deleteReservationMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeleteReservationHandler}
            >
              Eliminar definitivamente
            </Button>
          </>
        }
      >
        {confirmDeleteReservation ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <p className="font-semibold">
              Reserva #{confirmDeleteReservation.id.slice(0, 8)}
            </p>
            <p className="mt-1 text-rose-700">
              Cliente: {confirmDeleteReservation.usuario?.nombre ?? confirmDeleteReservation.usuario_id.slice(0, 6)}
            </p>
          </div>
        ) : null}
      </Dialog>

      {/* Delete room dialog */}
      <Dialog
        open={!!confirmDeleteRoom}
        onClose={() => setConfirmDeleteRoom(null)}
        title="Eliminar habitación"
        description="Elimina la habitación del inventario. Considera cambiar el estado a MANTENIMIENTO o ELIMINADA en lugar de borrarla."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteRoom(null)}
              disabled={deleteRoomMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={deleteRoomMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeleteRoomHandler}
            >
              Eliminar habitación
            </Button>
          </>
        }
      >
        {confirmDeleteRoom ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <p className="font-semibold">
              Habitación {confirmDeleteRoom.numero} —{' '}
              {confirmDeleteRoom.tipo === 'SENCILLA'
                ? 'Sencilla'
                : confirmDeleteRoom.tipo === 'DOBLE'
                  ? 'Doble'
                  : 'Suite'}
            </p>
            <p className="mt-1 text-rose-700">
              Precio por noche: {formatCurrency(Number(confirmDeleteRoom.precio_noche))}
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export default AdminPage;
