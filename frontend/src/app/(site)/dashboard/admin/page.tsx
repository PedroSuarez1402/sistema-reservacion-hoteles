'use client';

import * as React from 'react';
import {
  Ban,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Hotel,
  Layers,
  Pencil,
  Plus,
  Search as SearchIcon,
  Sparkles,
  Tag as TagIcon,
  Trash2,
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
  PaqueteModal,
  RoomCard,
  RoomModal,
  ServicioModal,
  TagModal,
  useToast,
} from '@/components';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useCreatePackage,
  useCreateRoom,
  useCreateService,
  useCreateTag,
  useDeletePackage,
  useDeleteRoom,
  useDeleteService,
  useDeleteTag,
  usePackages,
  useRooms,
  useServices,
  useTagsPaginated,
  useTogglePackageStatus,
  useToggleServiceStatus,
  useUpdatePackage,
  useUpdateRoom,
  useUpdateService,
  useUpdateTag,
} from '@/hooks';
import type {
  ApiErrorResponse,
  CreatePaquetePayload,
  CreateRoomPayload,
  CreateServicioPayload,
  CreateTagPayload,
  Paquete,
  Room,
  ServicioAdicional,
  Tag,
  UpdatePaquetePayload,
  UpdateRoomPayload,
  UpdateServicioPayload,
  UpdateTagPayload,
} from '@/types';

type AdminTab = 'habitaciones' | 'etiquetas' | 'paquetes';

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

function PackageSummary({
  packages,
  services,
}: {
  packages: Paquete[];
  services: ServicioAdicional[];
}) {
  const totalP = packages.length;
  const activosP = packages.filter((p) => p.estado === 'ACTIVO').length;
  const inactivosP = packages.filter((p) => p.estado === 'INACTIVO').length;
  const totalS = services.length;

  const cards = [
    {
      label: 'Total paquetes',
      value: totalP.toString(),
      icon: <Gift className="h-5 w-5 text-primary-600" />,
      tone: 'bg-primary-50 ring-primary-100',
    },
    {
      label: 'Públicos en web (Activos)',
      value: activosP.toString(),
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'Desactivados / Ocultos',
      value: inactivosP.toString(),
      icon: <EyeOff className="h-5 w-5 text-slate-500" />,
      tone: 'bg-slate-50 ring-slate-200',
    },
    {
      label: 'Servicios base (Hojas)',
      value: totalS.toString(),
      icon: <Sparkles className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 ring-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl p-4 ring-1 ${card.tone}`}>
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
  const [activeTab, setActiveTab] = React.useState<AdminTab>('habitaciones');

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

  // Planes Turísticos y Servicios Adicionales (Patrón Composite)
  const packagesQuery = usePackages({ all: true });
  const servicesQuery = useServices({ all: true });

  const createPackageMutation = useCreatePackage();
  const updatePackageMutation = useUpdatePackage();
  const togglePackageStatusMutation = useTogglePackageStatus();
  const deletePackageMutation = useDeletePackage();

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const toggleServiceStatusMutation = useToggleServiceStatus();
  const deleteServiceMutation = useDeleteService();

  const [packageModalOpen, setPackageModalOpen] = React.useState(false);
  const [packageEditing, setPackageEditing] = React.useState<Paquete | null>(null);
  const [confirmDeletePackage, setConfirmDeletePackage] = React.useState<Paquete | null>(null);

  const [serviceModalOpen, setServiceModalOpen] = React.useState(false);
  const [serviceEditing, setServiceEditing] = React.useState<ServicioAdicional | null>(null);
  const [confirmDeleteService, setConfirmDeleteService] = React.useState<ServicioAdicional | null>(null);

  const [paquetesSubTab, setPaquetesSubTab] = React.useState<'paquetes' | 'servicios'>('paquetes');
  const [paqueteSearch, setPaqueteSearch] = React.useState('');
  const [servicioSearch, setServicioSearch] = React.useState('');

  React.useEffect(() => {
    setTagPage(1);
  }, [tagSearch]);

  React.useEffect(() => {
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
    if (packagesQuery.isError) {
      const err = packagesQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudieron cargar los paquetes turísticos';
      toast.error('Error al cargar paquetes', msg);
    }
    if (servicesQuery.isError) {
      const err = servicesQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudieron cargar los servicios adicionales';
      toast.error('Error al cargar servicios', msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomsQuery.isError,
    roomsQuery.error,
    tagsQuery.isError,
    tagsQuery.error,
    packagesQuery.isError,
    packagesQuery.error,
    servicesQuery.isError,
    servicesQuery.error,
  ]);

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

  function openCreatePackage() {
    setPackageEditing(null);
    setPackageModalOpen(true);
  }

  function openEditPackage(pkg: Paquete) {
    setPackageEditing(pkg);
    setPackageModalOpen(true);
  }

  async function handlePackageSubmit(
    payload: (CreatePaquetePayload | UpdatePaquetePayload) & { id?: string }
  ) {
    try {
      if (payload.id) {
        const { id, ...rest } = payload;
        await updatePackageMutation.mutateAsync({
          id,
          payload: rest as UpdatePaquetePayload,
        });
        toast.success('Paquete actualizado', `Se actualizó "${payload.nombre}" correctamente`);
      } else {
        await createPackageMutation.mutateAsync(payload as CreatePaquetePayload);
        toast.success('Paquete creado', `Se creó "${payload.nombre}" con el patrón Composite`);
      }
      setPackageModalOpen(false);
      setPackageEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el paquete';
      toast.error('Error al guardar paquete', message);
    }
  }

  async function handleTogglePackageStatus(pkg: Paquete) {
    const nextEstado = pkg.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await togglePackageStatusMutation.mutateAsync({ id: pkg.id, estado: nextEstado });
      toast.success(
        nextEstado === 'ACTIVO' ? 'Paquete publicado' : 'Paquete desactivado',
        `"${pkg.nombre}" ahora está ${nextEstado === 'ACTIVO' ? 'público en la web y recepción' : 'oculto/desactivado'}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cambiar la visibilidad';
      toast.error('Error al cambiar visibilidad', message);
    }
  }

  async function confirmDeletePackageHandler() {
    if (!confirmDeletePackage) return;
    try {
      await deletePackageMutation.mutateAsync(confirmDeletePackage.id);
      toast.success(
        'Paquete procesado',
        `"${confirmDeletePackage.nombre}" fue eliminado o archivado según reservaciones activas`
      );
      setConfirmDeletePackage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el paquete';
      toast.error('Error al eliminar paquete', message);
    }
  }

  function openCreateService() {
    setServiceEditing(null);
    setServiceModalOpen(true);
  }

  function openEditService(service: ServicioAdicional) {
    setServiceEditing(service);
    setServiceModalOpen(true);
  }

  async function handleServiceSubmit(
    payload: (CreateServicioPayload | UpdateServicioPayload) & { id?: string }
  ) {
    try {
      if (payload.id) {
        const { id, ...rest } = payload;
        await updateServiceMutation.mutateAsync({
          id,
          payload: rest as UpdateServicioPayload,
        });
        toast.success('Servicio actualizado', `Se actualizó "${payload.nombre}"`);
      } else {
        await createServiceMutation.mutateAsync(payload as CreateServicioPayload);
        toast.success('Servicio creado', `Se agregó "${payload.nombre}" al catálogo base`);
      }
      setServiceModalOpen(false);
      setServiceEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el servicio';
      toast.error('Error al guardar servicio', message);
    }
  }

  async function handleToggleServiceStatus(service: ServicioAdicional) {
    const nextEstado = service.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await toggleServiceStatusMutation.mutateAsync({ id: service.id, estado: nextEstado });
      toast.success(
        nextEstado === 'ACTIVO' ? 'Servicio activado' : 'Servicio desactivado',
        `"${service.nombre}" ahora está ${nextEstado === 'ACTIVO' ? 'activo' : 'inactivo'}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cambiar el estado';
      toast.error('Error al cambiar estado del servicio', message);
    }
  }

  async function confirmDeleteServiceHandler() {
    if (!confirmDeleteService) return;
    try {
      await deleteServiceMutation.mutateAsync(confirmDeleteService.id);
      toast.success(
        'Servicio procesado',
        `"${confirmDeleteService.nombre}" fue eliminado o desactivado según dependencias`
      );
      setConfirmDeleteService(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el servicio';
      toast.error('Error al eliminar servicio', message);
    }
  }

  const filteredPackages = React.useMemo(() => {
    const query = paqueteSearch.trim().toLowerCase();
    if (!query) return packagesQuery.data ?? [];
    return (packagesQuery.data ?? []).filter(
      (p) =>
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query))
    );
  }, [packagesQuery.data, paqueteSearch]);

  const filteredServices = React.useMemo(() => {
    const query = servicioSearch.trim().toLowerCase();
    if (!query) return servicesQuery.data ?? [];
    return (servicesQuery.data ?? []).filter(
      (s) =>
        s.nombre.toLowerCase().includes(query) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(query))
    );
  }, [servicesQuery.data, servicioSearch]);

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
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
    {
      key: 'paquetes',
      label: 'Planes y Paquetes',
      icon: <Gift className="h-4 w-4" />,
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
                Gestiona el inventario de habitaciones, planes turísticos (Composite) y catálogo de etiquetas.
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
            ) : activeTab === 'paquetes' ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={openCreateService}
                >
                  Nuevo servicio base
                </Button>
                <Button
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={openCreatePackage}
                >
                  Crear paquete
                </Button>
              </div>
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

      {activeTab === 'habitaciones' ? (
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
      ) : activeTab === 'etiquetas' ? (
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
      ) : (
        <>
          <PackageSummary
            packages={packagesQuery.data ?? []}
            services={servicesQuery.data ?? []}
          />
          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPaquetesSubTab('paquetes')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                    paquetesSubTab === 'paquetes'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Gift className="h-4 w-4 text-primary-600" />
                  Planes y Paquetes ({packagesQuery.data?.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPaquetesSubTab('servicios')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                    paquetesSubTab === 'servicios'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Servicios Base ({servicesQuery.data?.length ?? 0})
                </button>
              </div>

              <div className="w-full sm:max-w-xs">
                {paquetesSubTab === 'paquetes' ? (
                  <Input
                    placeholder="Buscar paquete..."
                    leftIcon={<SearchIcon className="h-4 w-4" />}
                    value={paqueteSearch}
                    onChange={(e) => setPaqueteSearch(e.target.value)}
                  />
                ) : (
                  <Input
                    placeholder="Buscar servicio base..."
                    leftIcon={<SearchIcon className="h-4 w-4" />}
                    value={servicioSearch}
                    onChange={(e) => setServicioSearch(e.target.value)}
                  />
                )}
              </div>
            </div>

            {paquetesSubTab === 'paquetes' ? (
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Planes y Paquetes Turísticos
                    </h3>
                    <Badge variant="default" className="text-xs bg-primary-100 text-primary-800 border-primary-200">
                      Patrón Composite
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    Composición dinámica de servicios base aplicando el patrón Composite con descuentos porcentuales y control de visibilidad pública.
                  </p>
                </div>

                {packagesQuery.isLoading ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white"
                      />
                    ))}
                  </div>
                ) : packagesQuery.isError ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                          <p className="font-semibold text-rose-700">Error al cargar paquetes</p>
                          <p className="text-sm text-rose-600">
                            {(() => {
                              const e = packagesQuery.error as unknown as ApiErrorResponse | Error | null;
                              return e && 'message' in e ? e.message : 'Inténtalo de nuevo.';
                            })()}
                          </p>
                        </div>
                        <Button onClick={() => packagesQuery.refetch()}>Reintentar</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredPackages.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 ring-1 ring-primary-100">
                        <Gift className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800">
                          {paqueteSearch.trim()
                            ? 'No hay paquetes que coincidan con la búsqueda'
                            : 'Aún no has creado planes ni paquetes turísticos'}
                        </p>
                        <p className="max-w-sm text-sm text-slate-500">
                          {paqueteSearch.trim()
                            ? 'Prueba con otros términos de búsqueda.'
                            : 'Diseña tu primer paquete turístico agrupando servicios base con el patrón Composite.'}
                        </p>
                      </div>
                      {!paqueteSearch.trim() ? (
                        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePackage}>
                          Crear primer paquete
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPackages.map((pkg) => {
                      const isActive = pkg.estado === 'ACTIVO';
                      const discount = Number(pkg.descuento_porcentaje) || 0;
                      return (
                        <div
                          key={pkg.id}
                          className={cn(
                            'flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md',
                            isActive ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/50 opacity-80 hover:opacity-100'
                          )}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isActive ? (
                                  <Badge variant="success" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Público en Web
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 border-slate-300 text-slate-600">
                                    <EyeOff className="h-3 w-3" />
                                    Oculto / Pausado
                                  </Badge>
                                )}
                                {discount > 0 ? (
                                  <Badge variant="info">-{discount}% OFF</Badge>
                                ) : null}
                              </div>
                              <span className="text-xs text-slate-600 font-mono">
                                #{pkg.id.slice(0, 6)}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-base font-bold text-slate-900">{pkg.nombre}</h4>
                              {pkg.descripcion ? (
                                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                  {pkg.descripcion}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs italic text-slate-600">
                                  Sin descripción adicional
                                </p>
                              )}
                            </div>

                            {/* Composite Breakdown Preview */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs font-medium text-slate-500">Precio neto:</span>
                                <div className="text-right">
                                  <span className="text-lg font-extrabold text-primary-700">
                                    {formatCurrency(Number(pkg.precio_total || pkg.composite_desglose?.total_neto || 0))}
                                  </span>
                                  {discount > 0 && pkg.composite_desglose?.subtotal_bruto ? (
                                    <div className="text-[11px] text-slate-400 line-through">
                                      {formatCurrency(pkg.composite_desglose.subtotal_bruto)}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {discount > 0 && (pkg.composite_desglose?.descuento_monto || pkg.composite_desglose?.ahorro_descuento) ? (
                                <div className="flex items-center justify-between text-[11px] text-emerald-600 font-medium">
                                  <span>Ahorro del cliente:</span>
                                  <span>
                                    -{formatCurrency(
                                      pkg.composite_desglose.descuento_monto ??
                                        pkg.composite_desglose.ahorro_descuento ??
                                        0
                                    )}
                                  </span>
                                </div>
                              ) : null}

                              {/* Servicios incluidos */}
                              <div className="pt-2 border-t border-slate-200/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                  <span>Servicios incluidos:</span>
                                  <span className="text-slate-600 font-normal">({pkg.servicios?.length || 0})</span>
                                </p>
                                {pkg.servicios && pkg.servicios.length > 0 ? (
                                  <ul className="space-y-1">
                                    {pkg.servicios.map((srv) => (
                                      <li
                                        key={srv.id}
                                        className="flex items-center justify-between text-xs text-slate-600"
                                      >
                                        <span className="truncate pr-2">
                                          • {srv.nombre}{' '}
                                          <span className="text-slate-600 font-mono">
                                            x{srv.PaqueteServicio?.cantidad || 1}
                                          </span>
                                        </span>
                                        <span className="shrink-0 font-medium text-slate-700">
                                          {formatCurrency(
                                            Number(srv.precio) * (srv.PaqueteServicio?.cantidad || 1)
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs italic text-amber-600">
                                    Sin servicios asignados aún
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'flex-1 text-xs',
                                isActive
                                  ? 'text-slate-700 hover:text-amber-700 hover:border-amber-300'
                                  : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                              )}
                              loading={togglePackageStatusMutation.isPending}
                              leftIcon={isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              onClick={() => handleTogglePackageStatus(pkg)}
                            >
                              {isActive ? 'Pausar' : 'Publicar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              leftIcon={<Pencil className="h-3.5 w-3.5" />}
                              onClick={() => openEditPackage(pkg)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="px-2.5"
                              onClick={() => setConfirmDeletePackage(pkg)}
                              title="Eliminar o archivar paquete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Subtab: Servicios Base */
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Catálogo de Servicios Adicionales
                    </h3>
                    <Badge variant="default" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                      Hojas Atómicas
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    Servicios elementales que pueden contratarse por separado o combinarse en paquetes turísticos con el patrón Composite.
                  </p>
                </div>

                {servicesQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white"
                      />
                    ))}
                  </div>
                ) : servicesQuery.isError ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                          <p className="font-semibold text-rose-700">Error al cargar servicios</p>
                          <p className="text-sm text-rose-600">
                            {(() => {
                              const e = servicesQuery.error as unknown as ApiErrorResponse | Error | null;
                              return e && 'message' in e ? e.message : 'Inténtalo de nuevo.';
                            })()}
                          </p>
                        </div>
                        <Button onClick={() => servicesQuery.refetch()}>Reintentar</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredServices.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                        <Sparkles className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800">
                          {servicioSearch.trim()
                            ? 'No hay servicios que coincidan con la búsqueda'
                            : 'Aún no hay servicios registrados'}
                        </p>
                        <p className="max-w-sm text-sm text-slate-500">
                          {servicioSearch.trim()
                            ? 'Prueba con otros términos de búsqueda.'
                            : 'Agrega servicios base (desayuno buffet, tour, spa, etc.) para armar paquetes.'}
                        </p>
                      </div>
                      {!servicioSearch.trim() ? (
                        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateService}>
                          Crear primer servicio
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <Card>
                      <CardContent className="divide-y divide-slate-100 p-0">
                        {filteredServices.map((srv) => {
                          const isActivo = srv.estado === 'ACTIVO';
                          const usedInPackages = (packagesQuery.data ?? []).filter((p) =>
                            (p.servicios ?? []).some((s) => s.id === srv.id)
                          ).length;

                          return (
                            <div
                              key={srv.id}
                              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200">
                                  <Sparkles className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-semibold text-slate-900">{srv.nombre}</h4>
                                    {isActivo ? (
                                      <Badge variant="success" className="text-[11px] py-0">
                                        Activo
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[11px] py-0 text-slate-500">
                                        Inactivo
                                      </Badge>
                                    )}
                                  </div>
                                  {srv.descripcion ? (
                                    <p className="text-sm text-slate-600 line-clamp-2">
                                      {srv.descripcion}
                                    </p>
                                  ) : (
                                    <p className="text-xs italic text-slate-400">
                                      Sin descripción adicional
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500">
                                    Incluido en{' '}
                                    <span className="font-semibold text-slate-700">{usedInPackages}</span>{' '}
                                    paquete{usedInPackages === 1 ? '' : 's'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                                <div className="text-right">
                                  <p className="text-xs text-slate-600 uppercase font-medium">Precio base</p>
                                  <p className="text-base font-bold text-slate-900">
                                    {formatCurrency(Number(srv.precio))}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleServiceStatus(srv)}
                                    title={isActivo ? 'Desactivar servicio' : 'Activar servicio'}
                                    loading={toggleServiceStatusMutation.isPending}
                                  >
                                    {isActivo ? (
                                      <EyeOff className="h-4 w-4 text-slate-500" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-emerald-600" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Pencil className="h-4 w-4" />}
                                    onClick={() => openEditService(srv)}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setConfirmDeleteService(srv)}
                                    title="Eliminar o desactivar servicio"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                )}
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

      <PaqueteModal
        open={packageModalOpen}
        onClose={() => {
          setPackageModalOpen(false);
          setPackageEditing(null);
        }}
        initialValue={packageEditing}
        onSubmit={handlePackageSubmit}
      />

      <ServicioModal
        open={serviceModalOpen}
        onClose={() => {
          setServiceModalOpen(false);
          setServiceEditing(null);
        }}
        initialValue={serviceEditing}
        onSubmit={handleServiceSubmit}
      />

      <Dialog
        open={!!confirmDeletePackage}
        onClose={() => setConfirmDeletePackage(null)}
        title="Eliminar paquete turístico"
        description="Si el paquete está asociado a reservaciones existentes, se archivará y desactivará para proteger el historial."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeletePackage(null)}
              disabled={deletePackageMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={deletePackageMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeletePackageHandler}
            >
              Eliminar paquete
            </Button>
          </>
        }
      >
        {confirmDeletePackage ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <p className="font-semibold text-base">
              {confirmDeletePackage.nombre}
            </p>
            <p className="mt-1 text-rose-700">
              Precio total:{' '}
              {formatCurrency(
                Number(
                  confirmDeletePackage.precio_total ||
                    confirmDeletePackage.composite_desglose?.total_neto ||
                    0
                )
              )}{' '}
              · Descuento: {confirmDeletePackage.descuento_porcentaje}%
            </p>
            <p className="mt-1 text-xs text-rose-600">
              Contiene {confirmDeletePackage.servicios?.length || 0} servicio(s) base en su composición.
            </p>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={!!confirmDeleteService}
        onClose={() => setConfirmDeleteService(null)}
        title="Eliminar servicio adicional"
        description="Si este servicio está incluido en paquetes o reservaciones, se cambiará su estado a INACTIVO automáticamente."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteService(null)}
              disabled={deleteServiceMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={deleteServiceMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeleteServiceHandler}
            >
              Eliminar servicio
            </Button>
          </>
        }
      >
        {confirmDeleteService ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <p className="font-semibold text-base">
              {confirmDeleteService.nombre}
            </p>
            <p className="mt-1 text-rose-700">
              Precio base: {formatCurrency(Number(confirmDeleteService.precio))}
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export default AdminPage;
