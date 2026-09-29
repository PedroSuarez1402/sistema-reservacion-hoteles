'use client';

import * as React from 'react';
import {
  Ban,
  CalendarCheck,
  CalendarPlus2,
  Hotel,
  Pencil,
  Plus,
  Search as SearchIcon,
  Tag as TagIcon,
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
  Input,
  Pagination,
  ReservationTable,
  RoomCard,
  RoomModal,
  TagModal,
  useToast,
} from '@/components';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useAllReservations,
  useCancelReservation,
  useCreateRoom,
  useCreateTag,
  useDeleteReservation,
  useDeleteRoom,
  useDeleteTag,
  useRooms,
  useTagsPaginated,
  useUpdateReservationStatus,
  useUpdateRoom,
  useUpdateTag,
} from '@/hooks';
import type {
  ApiErrorResponse,
  CreateRoomPayload,
  CreateTagPayload,
  Reservation,
  ReservationStatus,
  Room,
  Tag,
  UpdateRoomPayload,
  UpdateTagPayload,
} from '@/types';

type AdminTab = 'reservaciones' | 'habitaciones' | 'etiquetas';

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

function TagSummary({
  totalTags,
  rooms,
}: {
  totalTags: number;
  rooms: Room[];
}) {
  const taggedRooms = rooms.filter(
    (r) => Array.isArray(r.etiquetas) && r.etiquetas.length > 0
  ).length;
  const avgTagsPerRoom =
    rooms.length > 0
      ? rooms.reduce((acc, r) => acc + ((r.etiquetas?.length) ?? 0), 0) / rooms.length
      : 0;
  const usedTagIds = new Set<string>();
  rooms.forEach((r) => {
    (r.etiquetas ?? []).forEach((t) => {
      if (t?.id) usedTagIds.add(t.id);
    });
  });
  const unusedTags = Math.max(0, totalTags - usedTagIds.size);

  const cards = [
    {
      label: 'Etiquetas en catálogo',
      value: totalTags.toString(),
      icon: <TagIcon className="h-5 w-5 text-primary-600" />,
      tone: 'bg-primary-50 ring-primary-100',
    },
    {
      label: 'Habitaciones etiquetadas',
      value: `${taggedRooms} / ${rooms.length}`,
      icon: <Hotel className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'Promedio / habitación',
      value: avgTagsPerRoom.toFixed(1),
      icon: <span className="text-lg">📋</span>,
      tone: 'bg-sky-50 ring-sky-100',
    },
    {
      label: 'Sin usar',
      value: unusedTags.toString(),
      icon: <SearchIcon className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 ring-amber-100',
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

  const reservationsQuery = useAllReservations();
  const cancelMutation = useCancelReservation();
  const statusMutation = useUpdateReservationStatus();
  const deleteReservationMutation = useDeleteReservation();

  const [confirmCancel, setConfirmCancel] = React.useState<Reservation | null>(null);
  const [confirmDeleteReservation, setConfirmDeleteReservation] = React.useState<Reservation | null>(null);

  const roomsQuery = useRooms();
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const deleteRoomMutation = useDeleteRoom();

  const [roomModalOpen, setRoomModalOpen] = React.useState(false);
  const [roomEditing, setRoomEditing] = React.useState<Room | null>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = React.useState<Room | null>(null);

  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const [tagModalOpen, setTagModalOpen] = React.useState(false);
  const [tagEditing, setTagEditing] = React.useState<Tag | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = React.useState<Tag | null>(null);
  const [tagSearch, setTagSearch] = React.useState('');
  const [tagPage, setTagPage] = React.useState(1);
  const tagLimit = 8;

  const tagsQuery = useTagsPaginated({
    keyword: tagSearch,
    page: tagPage,
    limit: tagLimit,
  });

  React.useEffect(() => {
    setTagPage(1);
  }, [tagSearch]);

  React.useEffect(() => {
    if (reservationsQuery.isError) {
      const err = reservationsQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudieron cargar las reservaciones';
      toast.error('Error al cargar reservaciones', msg);
    }
    if (roomsQuery.isError) {
      const err = roomsQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudo cargar el inventario de habitaciones';
      toast.error('Error al cargar habitaciones', msg);
    }
    if (tagsQuery.isError) {
      const err = tagsQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudo cargar el catálogo de etiquetas';
      toast.error('Error al cargar etiquetas', msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    reservationsQuery.isError,
    reservationsQuery.error,
    roomsQuery.isError,
    roomsQuery.error,
    tagsQuery.isError,
    tagsQuery.error,
  ]);

  async function handleStatusChange(id: string, estado: ReservationStatus) {
    try {
      await statusMutation.mutateAsync({ id, payload: { estado } });
      toast.success('Estado actualizado', `La reserva ahora está ${estado.toLowerCase()}`);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la habitación';
      toast.error('Error al eliminar habitación', message);
    }
  }

  function openCreateTag() {
    setTagEditing(null);
    setTagModalOpen(true);
  }

  function openEditTag(tag: Tag) {
    setTagEditing(tag);
    setTagModalOpen(true);
  }

  async function handleTagSubmit(
    payload: (CreateTagPayload & { id?: string }) | (UpdateTagPayload & { id?: string })
  ) {
    try {
      if (payload.id) {
        const { id, ...rest } = payload;
        await updateTagMutation.mutateAsync({
          id,
          payload: rest as UpdateTagPayload,
        });
        toast.success('Etiqueta actualizada', `Se actualizó "${payload.nombre ?? '(sin nombre)'}"`);
      } else {
        await createTagMutation.mutateAsync(payload as CreateTagPayload);
        toast.success('Etiqueta creada', `Se agregó "${payload.nombre}" al catálogo`);
      }
      setTagModalOpen(false);
      setTagEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la etiqueta';
      toast.error('Error al guardar etiqueta', message);
    }
  }

  async function confirmDeleteTagHandler() {
    if (!confirmDeleteTag) return;
    try {
      await deleteTagMutation.mutateAsync(confirmDeleteTag.id);
      toast.success(
        'Etiqueta eliminada',
        `"${confirmDeleteTag.nombre}" fue removida del catálogo`
      );
      setConfirmDeleteTag(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la etiqueta';
      toast.error('Error al eliminar etiqueta', message);
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
    {
      key: 'etiquetas',
      label: 'Etiquetas',
      icon: <TagIcon className="h-4 w-4" />,
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
                Gestiona reservaciones, inventario de habitaciones y catálogo de etiquetas.
              </CardDescription>
            </div>
            {activeTab === 'habitaciones' ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateRoom}>
                Agregar habitación
              </Button>
            ) : activeTab === 'etiquetas' ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateTag}>
                Nueva etiqueta
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
            isLoading={reservationsQuery.isLoading || reservationsQuery.isFetching}
            isStaff={true}
            showUserColumn={true}
            showRoomInfo={true}
            onCancel={(r) => setConfirmCancel(r)}
            onStatusChange={handleStatusChange}
            onDelete={(r) => setConfirmDeleteReservation(r)}
          />
          {reservationsQuery.isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-700">
                      Error al cargar las reservaciones
                    </p>
                    <p className="text-sm text-rose-600">
                      {(() => {
                        const e = reservationsQuery.error as unknown as ApiErrorResponse | Error | null;
                        return e && 'message' in e ? e.message : 'Inténtalo de nuevo en unos momentos.';
                      })()}
                    </p>
                  </div>
                  <Button onClick={() => reservationsQuery.refetch()}>Reintentar</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : activeTab === 'habitaciones' ? (
        <>
          <RoomSummary rooms={roomsQuery.data ?? []} />
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Inventario de habitaciones
              </h3>
              <p className="text-sm text-slate-500">
                Administra el inventario. Edita precios, tipos, estados, descripciones y etiquetas.
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
            ) : roomsQuery.isError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-700">
                        Error al cargar habitaciones
                      </p>
                      <p className="text-sm text-rose-600">
                        {(() => {
                          const e = roomsQuery.error as unknown as ApiErrorResponse | Error | null;
                          return e && 'message' in e ? e.message : 'Inténtalo de nuevo en unos momentos.';
                        })()}
                      </p>
                    </div>
                    <Button onClick={() => roomsQuery.refetch()}>Reintentar</Button>
                  </div>
                </CardContent>
              </Card>
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
      ) : (
        <>
          <TagSummary
            totalTags={tagsQuery.data?.meta.total ?? 0}
            rooms={roomsQuery.data ?? []}
          />
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Catálogo de etiquetas
                </h3>
                <p className="text-sm text-slate-500">
                  Crea y administra las características disponibles para asignar a las habitaciones.
                </p>
              </div>
              <div className="w-full sm:max-w-xs">
                <Input
                  placeholder="Buscar etiqueta..."
                  leftIcon={<SearchIcon className="h-4 w-4" />}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />
              </div>
            </div>
            {tagsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : tagsQuery.isError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-700">
                        Error al cargar etiquetas
                      </p>
                      <p className="text-sm text-rose-600">
                        {(() => {
                          const e = tagsQuery.error as unknown as ApiErrorResponse | Error | null;
                          return e && 'message' in e ? e.message : 'Inténtalo de nuevo en unos momentos.';
                        })()}
                      </p>
                    </div>
                    <Button onClick={() => tagsQuery.refetch()}>Reintentar</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (tagsQuery.data?.items.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 ring-1 ring-primary-100">
                    <TagIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800">
                      {tagSearch.trim()
                        ? 'No hay etiquetas que coincidan con tu búsqueda'
                        : 'Aún no hay etiquetas en el catálogo'}
                    </p>
                    <p className="max-w-sm text-sm text-slate-500">
                      {tagSearch.trim()
                        ? 'Intenta con otros términos o limpia el buscador.'
                        : 'Crea la primera etiqueta para empezar a describir las características de tus habitaciones.'}
                    </p>
                  </div>
                  {!tagSearch.trim() ? (
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateTag}>
                      Crear primera etiqueta
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card>
                  <CardContent className="divide-y divide-slate-100 p-0">
                    {(tagsQuery.data?.items ?? []).map((tag: Tag) => {
                      const usageCount = (roomsQuery.data ?? []).filter((r) =>
                        (r.etiquetas ?? []).some((rt) => rt.id === tag.id)
                      ).length;
                      return (
                        <div
                          key={tag.id}
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <Badge variant="default" className="shrink-0">
                              <TagIcon className="mr-1 h-3 w-3" aria-hidden="true" />
                              {tag.nombre}
                            </Badge>
                            <div className="min-w-0 space-y-0.5">
                              {tag.descripcion ? (
                                <p className="text-sm text-slate-600 line-clamp-2">
                                  {tag.descripcion}
                                </p>
                              ) : (
                                <p className="text-xs italic text-slate-400">
                                  Sin descripción administrativa
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                Asignada a{' '}
                                <span className="font-medium text-slate-700">{usageCount}</span>{' '}
                                habitacione{usageCount === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2 sm:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Pencil className="h-4 w-4" />}
                              onClick={() => openEditTag(tag)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() => setConfirmDeleteTag(tag)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Pagination
                  page={tagsQuery.data?.meta.page ?? tagPage}
                  totalPages={tagsQuery.data?.meta.totalPages ?? 1}
                  totalItems={tagsQuery.data?.meta.total}
                  perPage={tagsQuery.data?.meta.perPage ?? tagLimit}
                  onChange={(p) => setTagPage(p)}
                  isFetching={tagsQuery.isFetching}
                  showInfo={true}
                />
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

      <TagModal
        open={tagModalOpen}
        onClose={() => {
          setTagModalOpen(false);
          setTagEditing(null);
        }}
        initialValue={tagEditing}
        onSubmit={handleTagSubmit}
        isLoading={createTagMutation.isPending || updateTagMutation.isPending}
      />

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

      <Dialog
        open={!!confirmDeleteTag}
        onClose={() => setConfirmDeleteTag(null)}
        title="Eliminar etiqueta"
        description="La etiqueta será removida del catálogo y desasignada automáticamente de todas las habitaciones que la utilicen."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteTag(null)}
              disabled={deleteTagMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={deleteTagMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeleteTagHandler}
            >
              Eliminar etiqueta
            </Button>
          </>
        }
      >
        {confirmDeleteTag ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <div className="flex items-center gap-2">
              <Badge variant="danger">{confirmDeleteTag.nombre}</Badge>
              <span className="text-xs text-rose-600">#{confirmDeleteTag.id.slice(0, 8)}</span>
            </div>
            {confirmDeleteTag.descripcion ? (
              <p className="mt-2 text-rose-700">{confirmDeleteTag.descripcion}</p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export default AdminPage;
