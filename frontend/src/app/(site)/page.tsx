'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Search as SearchIcon, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  Input,
  RoomCard,
  useToast,
} from '@/components';
import {
  calculateNights,
  formatCurrency,
  formatDate,
  getTodayIso,
  getTomorrowIso,
} from '@/lib/utils';
import {
  useAvailableRooms,
  useCreateReservation,
  useRooms,
} from '@/hooks';
import useAuth from '@/hooks/useAuth';
import type { ApiErrorResponse, Room } from '@/types';

const searchSchema = z
  .object({
    fecha_inicio: z.string().min(1, 'Selecciona la fecha de llegada'),
    fecha_fin: z.string().min(1, 'Selecciona la fecha de salida'),
  })
  .refine((data) => new Date(data.fecha_fin) > new Date(data.fecha_inicio), {
    path: ['fecha_fin'],
    message: 'La salida debe ser posterior a la llegada',
  });

type SearchFormValues = z.infer<typeof searchSchema>;

function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const createReservation = useCreateReservation();
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = React.useState(false);

  const defaultDates = React.useMemo<SearchFormValues>(() => ({
    fecha_inicio: getTodayIso(),
    fecha_fin: getTomorrowIso(),
  }), []);

  const { register, handleSubmit, watch, formState: { errors, isValid } } =
    useForm<SearchFormValues>({
      resolver: zodResolver(searchSchema),
      defaultValues: defaultDates,
      mode: 'onTouched',
    });

  const watchFechaInicio = watch('fecha_inicio');
  const watchFechaFin = watch('fecha_fin');

  const [paramsForQuery, setParamsForQuery] = React.useState<SearchFormValues | null>(null);

  const allRooms = useRooms();
  const availableQuery = useAvailableRooms(paramsForQuery);

  React.useEffect(() => {
    if (availableQuery.isError) {
      const err = availableQuery.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudo consultar la disponibilidad';
      toast.error('Error al buscar disponibilidad', msg);
    }
    if (allRooms.isError) {
      const err = allRooms.error as unknown as ApiErrorResponse | Error | null;
      const msg =
        (err && 'message' in err ? err.message : undefined) ||
        'No se pudo cargar el inventario de habitaciones';
      toast.error('Error al cargar habitaciones', msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    availableQuery.isError,
    availableQuery.error,
    allRooms.isError,
    allRooms.error,
  ]);

  function handleSearch(values: SearchFormValues) {
    setParamsForQuery(values);
  }

  const rooms = paramsForQuery ? availableQuery.data : allRooms.data;
  const roomsLoading = paramsForQuery ? availableQuery.isFetching : allRooms.isLoading;

  const nights = calculateNights(watchFechaInicio, watchFechaFin);

  function handleBookRoom(room: Room) {
    if (!isValid) {
      toast.warning('Fechas requeridas', 'Primero selecciona las fechas de tu estancia');
      return;
    }
    if (!isAuthenticated && !authLoading) {
        router.push(`/login?redirect=${encodeURIComponent('/')}`);
        return;
    }
    if (!paramsForQuery) {
      setParamsForQuery({ fecha_inicio: watchFechaInicio, fecha_fin: watchFechaFin });
    }
    setSelectedRoom(room);
    setBookingDialogOpen(true);
  }

  async function confirmBooking() {
    if (!selectedRoom) return;
    const payload = paramsForQuery ?? {
      fecha_inicio: watchFechaInicio,
      fecha_fin: watchFechaFin,
    };
    if (!payload.fecha_inicio || !payload.fecha_fin) {
      toast.warning('Fechas incompletas', 'Selecciona una fecha de llegada y salida válidas');
      return;
    }
    try {
      await createReservation.mutateAsync({
        habitacion_id: selectedRoom.id,
        fecha_inicio: payload.fecha_inicio,
        fecha_fin: payload.fecha_fin,
      });
      toast.success(
        '¡Reserva exitosa!',
        `Habitación ${selectedRoom.numero} reservada del ${formatDate(
          payload.fecha_inicio
        )} al ${formatDate(payload.fecha_fin)}`
      );
      setBookingDialogOpen(false);
      setSelectedRoom(null);
      router.push('/dashboard/mis-reservas');
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'No se pudo completar la reserva';
      toast.error('Error al reservar', message);
    }
  }

  const totalEstimate =
    selectedRoom
      ? calculateNights(
          paramsForQuery?.fecha_inicio ?? watchFechaInicio,
          paramsForQuery?.fecha_fin ?? watchFechaFin
        ) * Number(selectedRoom.precio_noche)
      : 0;

  return (
    <div className="flex flex-col gap-16">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="flex max-w-3xl flex-col gap-4 text-white">
            <Badge className="w-fit bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/20">
              <Sparkles className="mr-1 h-3 w-3" /> Reserva 100% garantizada
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Encuentra tu estancia
              <span className="block text-primary-100">perfecta en segundos</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-primary-50/90 sm:text-lg">
              Consulta disponibilidad en tiempo real, compara habitaciones y
              reserva con total seguridad. Sin sorpresas, solo descanso.
            </p>
          </div>

          <Card className="w-full border-0 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5">
            <CardContent className="p-5 sm:p-6">
              <form
                onSubmit={handleSubmit(handleSearch, (err) => console.debug('invalid', err))}
                className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                noValidate
              >
                <Input
                  type="date"
                  label="Fecha de llegada"
                  min={getTodayIso()}
                  leftIcon={<CalendarIcon className="h-4 w-4" />}
                  error={errors.fecha_inicio?.message}
                  {...register('fecha_inicio')}
                />
                <Input
                  type="date"
                  label="Fecha de salida"
                  min={watchFechaInicio || getTodayIso()}
                  leftIcon={<CalendarIcon className="h-4 w-4" />}
                  error={errors.fecha_fin?.message}
                  {...register('fecha_fin')}
                />
                <div className="flex items-end">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-[180px]"
                    loading={roomsLoading}
                    leftIcon={<SearchIcon className="h-4 w-4" />}
                  >
                    Buscar disponibilidad
                  </Button>
                </div>
              </form>
              {isValid && watchFechaInicio && watchFechaFin ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-2.5 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium text-primary-800">
                    {nights} noche{nights === 1 ? '' : 's'}
                  </span>
                  <span className="text-primary-300">•</span>
                  <span className="text-primary-700">
                    {formatDate(watchFechaInicio)} — {formatDate(watchFechaFin)}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-primary-700">
                    {paramsForQuery
                      ? availableQuery.isSuccess
                        ? `${availableQuery.data?.length ?? 0} habitaciones disponibles`
                        : 'Consultando disponibilidad...'
                      : 'Busca para ver disponibilidad'}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {paramsForQuery
              ? 'Habitaciones disponibles'
              : 'Nuestras habitaciones'}
          </h2>
          <p className="text-sm text-slate-500">
            {paramsForQuery
              ? 'Resultados según el rango de fechas seleccionado'
              : 'Explora el inventario. Ajusta las fechas para ver disponibilidad exacta.'}
          </p>
        </div>
        {!isAuthenticated ? (
          <Link href="/login">
            <Button variant="outline" size="sm">
              Inicia sesión para reservar
            </Button>
          </Link>
        ) : null}
        </div>

        {roomsLoading && !rooms ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              displayActions="booking"
              onBook={handleBookRoom}
              isLoading={createReservation.isPending}
            />
          ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 py-20 text-center">
            <CalendarIcon className="h-10 w-10 text-slate-300" />
            <p className="text-lg font-semibold text-slate-800">
              Sin habitaciones disponibles
            </p>
            <p className="max-w-sm text-sm text-slate-500">
              Intenta con otro rango de fechas o aumenta la flexibilidad en tus
              fechas de viaje.
            </p>
          </div>
        )}
      </section>

      <Dialog
        open={bookingDialogOpen}
        onClose={() => setBookingDialogOpen(false)}
        title="Confirmar reserva"
        description="Revisa los detalles y confirma tu reserva."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setBookingDialogOpen(false)}
              disabled={createReservation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={confirmBooking}
              loading={createReservation.isPending}
            >
              Confirmar reserva
            </Button>
          </>
        }
      >
        {selectedRoom ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-2xl">
                🛏️
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  Habitación {selectedRoom.numero}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedRoom.tipo === 'SENCILLA'
                    ? 'Sencilla'
                    : selectedRoom.tipo === 'DOBLE'
                      ? 'Doble'
                      : 'Suite'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">por noche</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(Number(selectedRoom.precio_noche))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Llegada</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(paramsForQuery?.fecha_inicio ?? watchFechaInicio)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Salida</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(paramsForQuery?.fecha_fin ?? watchFechaFin)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Noches</p>
                <p className="mt-1 font-medium text-slate-900">{nights}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-slate-500">Total estimado</p>
                <p className="mt-1 text-lg font-bold text-primary-700">
                  {formatCurrency(totalEstimate)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export default HomePage;
