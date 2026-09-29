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
  rolFilterOptions,
  useToast,
} from '@/components';
import type { SelectOption } from '@/components/ui/Select';
import { cn, formatCurrency, formatDate, roleLabels } from '@/lib/utils';
import {
  useAuth,
  useDeleteUser,
  useUpdateUser,
  useUsersPaginated,
} from '@/hooks';
import type {
  ApiErrorResponse,
  ClientListItem,
  UpdateUserPayload,
  UserRole,
} from '@/types';

type ClienteRolFilter = UserRole | 'all';

function ClientSummary({
  clients,
  total,
}: {
  clients: ClientListItem[];
  total: number;
}) {
  const today = new Date();
  const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nuevosMes = clients.filter(
    (c) => c.createdAt && new Date(c.createdAt) >= firstDayMonth
  ).length;
  const sinReservas = clients.filter((c) => c.reservaciones_count === 0).length;
  const ingresosSorted = [...clients]
    .map((c) => Number(c.ingreso_total) || 0)
    .sort((a, b) => b - a);
  const p90Index = Math.max(0, Math.ceil(ingresosSorted.length * 0.1) - 1);
  const p90Threshold = ingresosSorted[p90Index] ?? 0;
  const vipCount = clients.filter(
    (c) =>
      c.reservaciones_count >= 3 &&
      (Number(c.ingreso_total) || 0) >= Math.max(p90Threshold, 1)
  ).length;

  const cards = [
    {
      label: 'Total clientes',
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
      label: 'Sin reservas',
      value: sinReservas.toString(),
      icon: <XCircle className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 ring-amber-100',
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

function ClientesPage() {
  const toast = useToast();

  const { user: me } = useAuth();
  const isAdmin = me?.rol === 'ADMIN';
  const isRecepcion = me?.rol === 'RECEPCION';
  const canManageUsers = isAdmin;
  const canEditHuespedOnly = isAdmin || isRecepcion;

  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [clienteModalOpen, setClienteModalOpen] = React.useState(false);
  const [clienteEditing, setClienteEditing] =
    React.useState<ClientListItem | null>(null);
  const [confirmDeleteCliente, setConfirmDeleteCliente] =
    React.useState<ClientListItem | null>(null);
  const [clienteSearch, setClienteSearch] = React.useState('');
  const [clientePage, setClientePage] = React.useState(1);
  const [clienteRol, setClienteRol] = React.useState<ClienteRolFilter>('all');
  const clienteLimit = 8;

  const usersQuery = useUsersPaginated({
    keyword: clienteSearch,
    page: clientePage,
    limit: clienteLimit,
    rol: clienteRol === 'all' ? undefined : clienteRol,
  });

  React.useEffect(() => {
    setClientePage(1);
  }, [clienteSearch, clienteRol]);

  React.useEffect(() => {
    if (usersQuery.isError) {
      const err = usersQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudo cargar la lista de clientes';
      toast.error('Error al cargar clientes', msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersQuery.isError, usersQuery.error]);

  function openEditCliente(cliente: ClientListItem) {
    setClienteEditing(cliente);
    setClienteModalOpen(true);
  }

  async function handleClienteSubmit(payload: UpdateUserPayload & { id: string }) {
    try {
      const { id, ...rest } = payload;
      await updateUserMutation.mutateAsync({ id, payload: rest });
      toast.success(
        'Cliente actualizado',
        `Se actualizaron los datos de "${payload.nombre ?? '(cliente)'}"`
      );
      setClienteModalOpen(false);
      setClienteEditing(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar el cliente';
      toast.error('Error al guardar cliente', message);
    }
  }

  async function confirmDeleteClienteHandler() {
    if (!confirmDeleteCliente) return;
    try {
      await deleteUserMutation.mutateAsync(confirmDeleteCliente.id);
      toast.success(
        'Usuario eliminado',
        `"${confirmDeleteCliente.nombre}" fue removido del sistema`
      );
      setConfirmDeleteCliente(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar el usuario';
      toast.error('Error al eliminar usuario', message);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Clientes</Badge>
                <h2 className="text-xl font-bold text-slate-900">
                  Registro de clientes
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Visualiza todos los usuarios registrados, su historial de
                reservas e ingresos generados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ClientSummary
        clients={usersQuery.data?.items ?? []}
        total={usersQuery.data?.meta.total ?? 0}
      />

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Lista de usuarios
            </h3>
            <p className="text-sm text-slate-500">
              Busca por nombre o email y filtra por rol.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-xs">
              <Input
                placeholder="Buscar nombre o email..."
                leftIcon={<SearchIcon className="h-4 w-4" />}
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {rolFilterOptions.map((opt) => {
            const active = clienteRol === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setClienteRol(opt.value as ClienteRolFilter)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {usersQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : usersQuery.isError ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p className="font-semibold text-rose-700">
                    Error al cargar clientes
                  </p>
                  <p className="text-sm text-rose-600">
                    {(() => {
                      const e = usersQuery.error as unknown as
                        | ApiErrorResponse
                        | Error
                        | null;
                      return e && 'message' in e
                        ? e.message
                        : 'Inténtalo de nuevo en unos momentos.';
                    })()}
                  </p>
                </div>
                <Button onClick={() => usersQuery.refetch()}>Reintentar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <ClientesTable
              clients={usersQuery.data?.items ?? []}
              isLoading={usersQuery.isLoading || usersQuery.isFetching}
              canEdit={
                canManageUsers ||
                (canEditHuespedOnly && clienteEditing?.rol === 'HUESPED') ||
                canEditHuespedOnly
              }
              canDelete={canManageUsers}
              onEdit={(c) => {
                if (!canEditHuespedOnly) return;
                if (!canManageUsers && c.rol !== 'HUESPED') {
                  toast.warning(
                    'Solo puedes editar huéspedes',
                    'Contacta a un administrador para cambiar datos de otros roles.'
                  );
                  return;
                }
                openEditCliente(c);
              }}
              onDelete={(c) => canManageUsers && setConfirmDeleteCliente(c)}
            />
            <Pagination
              page={usersQuery.data?.meta.page ?? clientePage}
              totalPages={usersQuery.data?.meta.totalPages ?? 1}
              totalItems={usersQuery.data?.meta.total}
              perPage={usersQuery.data?.meta.perPage ?? clienteLimit}
              onChange={(p) => setClientePage(p)}
              isFetching={usersQuery.isFetching}
              showInfo={true}
            />
          </div>
        )}
      </section>

      <ClienteModal
        open={clienteModalOpen}
        onClose={() => {
          setClienteModalOpen(false);
          setClienteEditing(null);
        }}
        initialValue={clienteEditing}
        canEditRole={canManageUsers}
        onSubmit={handleClienteSubmit}
        isLoading={updateUserMutation.isPending}
      />

      <Dialog
        open={!!confirmDeleteCliente}
        onClose={() => setConfirmDeleteCliente(null)}
        title="Eliminar usuario"
        description="Esta acción es irreversible. Si el usuario tiene reservas asociadas no podrá eliminarse y deberás contactar a soporte."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteCliente(null)}
              disabled={deleteUserMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={deleteUserMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={confirmDeleteClienteHandler}
            >
              Sí, eliminar usuario
            </Button>
          </>
        }
      >
        {confirmDeleteCliente ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white shadow-sm ring-2 ring-white">
                {confirmDeleteCliente.nombre
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  {confirmDeleteCliente.nombre}
                </p>
                <p className="text-xs text-slate-600">
                  {confirmDeleteCliente.email}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant="outline"
                    className="rounded-full border bg-white text-slate-700"
                  >
                    {roleLabels[confirmDeleteCliente.rol] ??
                      confirmDeleteCliente.rol}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border bg-white text-slate-700"
                  >
                    {confirmDeleteCliente.reservaciones_count} reserva
                    {confirmDeleteCliente.reservaciones_count === 1 ? '' : 's'}
                  </Badge>
                  {confirmDeleteCliente.createdAt ? (
                    <span className="text-xs text-slate-500">
                      Registrado {formatDate(confirmDeleteCliente.createdAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export default ClientesPage;
