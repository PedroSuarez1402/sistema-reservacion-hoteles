'use client';

import * as React from 'react';
import {
  Crown,
  Pencil,
  Search as SearchIcon,
  Trash2,
  UserPlus,
  Users,
  XCircle,
  UserCheck,
  Building,
  User,
  Plus,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ClientesTable,
  ClienteModal,
  Dialog,
  Input,
  Pagination,
  useToast,
} from '@/components';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  useAuth,
  useClientesPaginated,
  useCreateCliente,
  useUpdateCliente,
  useDeleteCliente,
} from '@/hooks';
import type { Cliente, Acompanante } from '@/types';

type ClienteFilterTab = 'all' | 'con_acompanantes' | 'con_reservas' | 'vip';

function ClientSummary({
  clients,
  total,
}: {
  clients: Cliente[];
  total: number;
}) {
  const today = new Date();
  const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const nuevosMes = clients.filter(
    (c) => c.createdAt && new Date(c.createdAt) >= firstDayMonth
  ).length;

  const conAcompanantes = clients.filter(
    (c) => (c.acompanantes?.length ?? 0) > 0
  ).length;

  const vipCount = clients.filter((c) => {
    const rCount = c.reservaciones_count ?? (c.reservaciones?.length ?? 0);
    const gasto = (c.reservaciones ?? []).reduce(
      (sum, r) => sum + (Number(r.precio_total) || 0),
      0
    );
    return rCount >= 3 || gasto >= 500;
  }).length;

  const cards = [
    {
      label: 'Clientes Registrados',
      value: total.toString(),
      icon: <Users className="h-5 w-5 text-primary-600" />,
      tone: 'bg-primary-50 ring-primary-100',
    },
    {
      label: 'Nuevos este mes',
      value: nuevosMes.toString(),
      icon: <UserPlus className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'Con Acompañantes',
      value: conAcompanantes.toString(),
      icon: <UserCheck className="h-5 w-5 text-blue-600" />,
      tone: 'bg-blue-50 ring-blue-100',
    },
    {
      label: 'Clientes VIP',
      value: vipCount.toString(),
      icon: <Crown className="h-5 w-5 text-amber-500" />,
      tone: 'bg-gradient-to-br from-amber-50 to-yellow-50 ring-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl p-4 ring-1 ${card.tone} shadow-2xs`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 shadow-xs ring-1 ring-white">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClientesPage() {
  const toast = useToast();

  const { user: me } = useAuth();
  const isAdmin = me?.rol === 'ADMIN';
  const isRecepcion = me?.rol === 'RECEPCION';
  const canManage = isAdmin || isRecepcion;
  const canDelete = isAdmin;

  const createClienteMutation = useCreateCliente();
  const updateClienteMutation = useUpdateCliente();
  const deleteClienteMutation = useDeleteCliente();

  const [clienteModalOpen, setClienteModalOpen] = React.useState(false);
  const [clienteEditing, setClienteEditing] = React.useState<Cliente | null>(null);
  const [confirmDeleteCliente, setConfirmDeleteCliente] = React.useState<Cliente | null>(null);
  const [clienteSearch, setClienteSearch] = React.useState('');
  const [clientePage, setClientePage] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<ClienteFilterTab>('all');
  const clienteLimit = 10;

  const clientesQuery = useClientesPaginated({
    keyword: clienteSearch,
    page: clientePage,
    limit: clienteLimit,
  });

  React.useEffect(() => {
    setClientePage(1);
  }, [clienteSearch]);

  React.useEffect(() => {
    if (clientesQuery.isError) {
      toast.error(
        'Error al cargar clientes',
        'No se pudo conectar con el servicio de reservaciones y clientes.'
      );
    }
  }, [clientesQuery.isError, toast]);

  function openCreateCliente() {
    setClienteEditing(null);
    setClienteModalOpen(true);
  }

  function openEditCliente(cliente: Cliente) {
    setClienteEditing(cliente);
    setClienteModalOpen(true);
  }

  async function handleClienteSubmit(payload: {
    id?: string;
    documento: string;
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
    observaciones?: string;
    acompanantes?: Array<{
      id?: string;
      nombre: string;
      documento?: string;
      parentesco?: string;
      telefono?: string;
    }>;
  }) {
    try {
      if (payload.id) {
        // Actualizar
        await updateClienteMutation.mutateAsync({
          id: payload.id,
          payload: {
            documento: payload.documento,
            nombre: payload.nombre,
            email: payload.email,
            telefono: payload.telefono,
            direccion: payload.direccion,
            observaciones: payload.observaciones,
          },
        });
        toast.success(
          'Cliente actualizado',
          `Se actualizaron los datos de "${payload.nombre}" exitosamente.`
        );
      } else {
        // Crear
        await createClienteMutation.mutateAsync({
          documento: payload.documento,
          nombre: payload.nombre,
          email: payload.email,
          telefono: payload.telefono,
          direccion: payload.direccion,
          observaciones: payload.observaciones,
          acompanantes: payload.acompanantes,
        });
        toast.success(
          'Cliente registrado',
          `"${payload.nombre}" fue registrado correctamente.`
        );
      }
      setClienteModalOpen(false);
      setClienteEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      toast.error('Error al guardar cliente', message);
    }
  }

  async function confirmDeleteClienteHandler() {
    if (!confirmDeleteCliente) return;
    try {
      await deleteClienteMutation.mutateAsync(confirmDeleteCliente.id);
      toast.success(
        'Cliente eliminado',
        `"${confirmDeleteCliente.nombre}" fue removido de la base de datos.`
      );
      setConfirmDeleteCliente(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar el cliente';
      toast.error('Error al eliminar cliente', message);
    }
  }

  // Filtrado local por pestañas rápidas si aplica
  const rawItems = clientesQuery.data?.items ?? [];
  const filteredItems = React.useMemo(() => {
    if (activeTab === 'con_acompanantes') {
      return rawItems.filter((c) => (c.acompanantes?.length ?? 0) > 0);
    }
    if (activeTab === 'con_reservas') {
      return rawItems.filter((c) => (c.reservaciones_count ?? (c.reservaciones?.length ?? 0)) > 0);
    }
    if (activeTab === 'vip') {
      return rawItems.filter((c) => {
        const rCount = c.reservaciones_count ?? (c.reservaciones?.length ?? 0);
        const gasto = (c.reservaciones ?? []).reduce(
          (sum, r) => sum + (Number(r.precio_total) || 0),
          0
        );
        return rCount >= 3 || gasto >= 500;
      });
    }
    return rawItems;
  }, [rawItems, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Gestión de Clientes</Badge>
                <h2 className="text-xl font-bold text-slate-900">
                  Directorio de Clientes y Acompañantes
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Registro independiente de huéspedes y sus acompañantes frecuentes, separados de los accesos al sistema.
              </p>
            </div>
            {canManage ? (
              <Button
                onClick={openCreateCliente}
                className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                Nuevo Cliente
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <ClientSummary
        clients={rawItems}
        total={clientesQuery.data?.meta.total ?? 0}
      />

      {/* Filtros y Búsqueda */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Buscar por documento, nombre, email o teléfono..."
              leftIcon={<SearchIcon className="h-4 w-4 text-slate-400" />}
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              className="bg-white shadow-2xs"
            />
          </div>

          {/* Tabs rápidas */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'con_acompanantes', label: 'Con Acompañantes' },
              { id: 'con_reservas', label: 'Con Reservas' },
              { id: 'vip', label: 'VIP' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ClienteFilterTab)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                    active
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla */}
        {clientesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : clientesQuery.isError ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p className="font-semibold text-rose-700">
                    Error al cargar clientes
                  </p>
                  <p className="text-sm text-rose-600">
                    Inténtalo de nuevo en unos momentos.
                  </p>
                </div>
                <Button onClick={() => clientesQuery.refetch()}>Reintentar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <ClientesTable
              clients={filteredItems}
              isLoading={clientesQuery.isLoading || clientesQuery.isFetching}
              canEdit={canManage}
              canDelete={canDelete}
              onEdit={openEditCliente}
              onDelete={(c) => canDelete && setConfirmDeleteCliente(c)}
            />
            <Pagination
              page={clientesQuery.data?.meta.page ?? clientePage}
              totalPages={clientesQuery.data?.meta.totalPages ?? 1}
              totalItems={clientesQuery.data?.meta.total}
              perPage={clientesQuery.data?.meta.perPage ?? clienteLimit}
              onChange={(p) => setClientePage(p)}
              isFetching={clientesQuery.isFetching}
              showInfo={true}
            />
          </div>
        )}
      </section>

      {/* Modal Crear / Editar Cliente */}
      <ClienteModal
        open={clienteModalOpen}
        onClose={() => {
          setClienteModalOpen(false);
          setClienteEditing(null);
        }}
        initialValue={clienteEditing}
        onSubmit={handleClienteSubmit}
        isLoading={createClienteMutation.isPending || updateClienteMutation.isPending}
      />

      {/* Dialog Eliminar Cliente */}
      <Dialog
        open={!!confirmDeleteCliente}
        onClose={() => setConfirmDeleteCliente(null)}
        title="Eliminar Cliente"
        description="Esta acción eliminará el cliente y sus acompañantes del directorio de clientes."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteCliente(null)}
              disabled={deleteClienteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={deleteClienteMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeleteClienteHandler}
            >
              Sí, eliminar cliente
            </Button>
          </>
        }
      >
        {confirmDeleteCliente ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-900 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{confirmDeleteCliente.nombre}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {confirmDeleteCliente.documento}
              </Badge>
            </div>
            <p className="text-xs text-rose-700">
              {confirmDeleteCliente.email}
              {confirmDeleteCliente.telefono ? ` • ${confirmDeleteCliente.telefono}` : ''}
            </p>
            {confirmDeleteCliente.acompanantes && confirmDeleteCliente.acompanantes.length > 0 ? (
              <p className="text-xs text-rose-600 font-medium">
                Nota: También se desvincularán sus {confirmDeleteCliente.acompanantes.length} acompañante(s).
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
