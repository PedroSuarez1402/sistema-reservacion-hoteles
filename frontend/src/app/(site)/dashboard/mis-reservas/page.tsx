'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, CalendarDays, Hotel, Plus } from 'lucide-react';
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
  useToast,
} from '@/components';
import { useCancelReservation, useMyReservations } from '@/hooks';
import { calculateNights, formatCurrency, formatDate } from '@/lib/utils';
import type { ApiErrorResponse, Reservation } from '@/types';

function SummaryCards({ reservations }: { reservations: Reservation[] }) {
  const total = reservations.length;
  const upcoming = reservations.filter((r) => r.estado === 'CONFIRMADA' || r.estado === 'PENDIENTE').length;
  const canceled = reservations.filter((r) => r.estado === 'CANCELADA').length;
  const totalSpent = reservations
    .filter((r) => r.estado !== 'CANCELADA')
    .reduce((acc, r) => acc + Number(r.precio_total), 0);

  const cards = [
    {
      label: 'Total reservas',
      value: total.toString(),
      icon: <CalendarDays className="h-5 w-5 text-primary-600" />,
      tone: 'bg-primary-50 ring-primary-100',
    },
    {
      label: 'Próximas / Activas',
      value: upcoming.toString(),
      icon: <Hotel className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'Canceladas',
      value: canceled.toString(),
      icon: <Ban className="h-5 w-5 text-rose-600" />,
      tone: 'bg-rose-50 ring-rose-100',
    },
    {
      label: 'Gasto total',
      value: formatCurrency(totalSpent),
      icon: <span className="text-lg">💳</span>,
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

function MyReservationsPage() {
  const router = useRouter();
  const toast = useToast();
  const {
    data: reservations,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useMyReservations();
  const cancelMutation = useCancelReservation();

  const [confirmCancelId, setConfirmCancelId] = React.useState<Reservation | null>(null);

  React.useEffect(() => {
    if (isError) {
      const err = error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudieron cargar tus reservas';
      toast.error('Error al cargar reservas', msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error]);

  async function handleCancel(reservation: Reservation) {
    setConfirmCancelId(reservation);
  }

  async function confirmCancel() {
    if (!confirmCancelId) return;
    try {
      await cancelMutation.mutateAsync(confirmCancelId.id);
      toast.success('Reserva cancelada', 'Tu reserva ha sido cancelada correctamente');
      setConfirmCancelId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cancelar la reserva';
      toast.error('Error al cancelar', message);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default">Vista Huésped</Badge>
                Mis reservas
              </CardTitle>
              <CardDescription>
                Historial completo de tus reservaciones, fechas y estados.
              </CardDescription>
            </div>
            <Link href="/">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                Nueva reserva
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <SummaryCards reservations={reservations ?? []} />
        </CardContent>
      </Card>

      <ReservationTable
        reservations={reservations}
        isLoading={isLoading || isFetching}
        isStaff={false}
        showRoomInfo={true}
        onCancel={handleCancel}
        isEmptyMessage="Aún no tienes reservas. ¡Reserva tu primera estancia!"
      />

      {isError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <p className="font-semibold text-rose-700">
                  No se pudieron cargar las reservas
                </p>
                <p className="text-sm text-rose-600">
                  {(() => {
                    const e = error as unknown as ApiErrorResponse | Error | null;
                    return e && 'message' in e ? e.message : 'Inténtalo de nuevo en unos momentos.';
                  })()}
                </p>
              </div>
              <Button onClick={() => refetch()}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={!!confirmCancelId}
        onClose={() => setConfirmCancelId(null)}
        title="Cancelar reserva"
        description="Esta acción no se puede deshacer. La habitación quedará disponible para otras personas."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmCancelId(null)}
              disabled={cancelMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              loading={cancelMutation.isPending}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Sí, cancelar reserva
            </Button>
          </>
        }
      >
        {confirmCancelId ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800">
            <p className="font-semibold">
              Habitación {confirmCancelId.habitacion?.numero ?? confirmCancelId.habitacion_id.slice(0, 6)}
            </p>
            <p className="mt-1 text-rose-700">
              {formatDate(confirmCancelId.fecha_inicio)} al{' '}
              {formatDate(confirmCancelId.fecha_fin)} ·{' '}
              {calculateNights(confirmCancelId.fecha_inicio, confirmCancelId.fecha_fin)} noches
            </p>
            <p className="mt-2 font-semibold">
              Total: {formatCurrency(Number(confirmCancelId.precio_total))}
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export default MyReservationsPage;
