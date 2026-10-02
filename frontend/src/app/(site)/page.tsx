'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, Search as SearchIcon, Sparkles, CheckCircle2, Gift, PhoneCall } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge, Button, Card, CardContent, Dialog, ImageCarousel, Input, RoomCard, useToast, WhatsAppIcon, } from '@/components';
import { cn, calculateNights, enrichRoomWithMedia, formatCurrency, formatDate, getTodayIso, getTomorrowIso, roomTypeLabels, } from '@/lib/utils';
import { buildWhatsAppUrl, buildRoomWhatsAppMessage, buildPackageWhatsAppMessage, buildGeneralWhatsAppMessage, DEFAULT_RECEPTION_WHATSAPP, } from '@/lib/whatsapp';
import { useAvailableRooms, usePackages, useRooms, } from '@/hooks';
import type { ApiErrorResponse, Room, Paquete } from '@/types';

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
  const toast = useToast();

  const { data: paquetes = [], isLoading: paquetesLoading } = usePackages();
  const [detailRoom, setDetailRoom] = React.useState<Room | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

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
  }, [
    availableQuery.isError,
    availableQuery.error,
    allRooms.isError,
    allRooms.error,
    toast,
  ]);

  function handleSearch(values: SearchFormValues) {
    setParamsForQuery(values);
  }

  const rooms = paramsForQuery ? availableQuery.data : allRooms.data;
  const roomsLoading = paramsForQuery ? availableQuery.isFetching : allRooms.isLoading;

  const nights = calculateNights(watchFechaInicio, watchFechaFin);

  function handleViewDetails(rawRoom: Room) {
    const media = !rawRoom.imagenes || rawRoom.imagenes.length === 0
      ? enrichRoomWithMedia(rawRoom)
      : rawRoom;
    setDetailRoom(media);
    setDetailDialogOpen(true);
  }

  function handleBookViaWhatsApp(room: Room) {
    const dates = watchFechaInicio && watchFechaFin
      ? { fecha_inicio: watchFechaInicio, fecha_fin: watchFechaFin }
      : undefined;

    const message = buildRoomWhatsAppMessage(room, dates);
    const url = buildWhatsAppUrl(message);

    toast.info(
      'Conectando con Recepción',
      `Abriendo WhatsApp para cotizar la Habitación ${room.numero}...`
    );

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const receptionPhone = process.env.NEXT_PUBLIC_RECEPTION_WHATSAPP || DEFAULT_RECEPTION_WHATSAPP;

  return (
    <div className="flex flex-col gap-16">
      {/* Hero Principal con Presentación y Buscador */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="flex max-w-3xl flex-col gap-4 text-white">
            <Badge className="w-fit bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/20">
              <Sparkles className="mr-1 h-3 w-3" /> Atención personalizada y reservas directas
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Encuentra tu estancia
              <span className="block text-primary-100">y reserva sin complicaciones</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-primary-50/90 sm:text-lg">
              Explora nuestras habitaciones, planes turísticos y servicios adicionales.
              Contáctanos de inmediato por WhatsApp para asegurar tu estadía al instante sin necesidad de registros.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={buildWhatsAppUrl(buildGeneralWhatsAppMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
              >
                <WhatsAppIcon className="h-5 w-5" />
                <span>Chatear con Recepción</span>
              </a>

              <a
                href={`tel:${receptionPhone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm transition-all"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Llamar: {receptionPhone}</span>
              </a>
            </div>
          </div>

          {/* Formulario de Disponibilidad */}
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
                    Consultar fechas
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
                      : 'Filtro aplicado al catálogo'}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Catálogo de Habitaciones */}
      <section id="habitaciones" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {paramsForQuery
                ? 'Habitaciones disponibles para tus fechas'
                : 'Nuestras Habitaciones'}
            </h2>
            <p className="text-sm text-slate-500">
              {paramsForQuery
                ? 'Elige la habitación de tu preferencia y resérvala directamente por WhatsApp con nuestra recepción.'
                : 'Explora nuestra variedad de acomodaciones con fotos, servicios incluidos y tarifas por noche.'}
            </p>
          </div>
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
                onBook={handleBookViaWhatsApp}
                onViewDetails={handleViewDetails}
                searchDates={
                  watchFechaInicio && watchFechaFin
                    ? { fecha_inicio: watchFechaInicio, fecha_fin: watchFechaFin }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 py-20 text-center">
            <CalendarIcon className="h-10 w-10 text-slate-300" />
            <p className="text-lg font-semibold text-slate-800">
              Sin habitaciones disponibles en estas fechas
            </p>
            <p className="max-w-sm text-sm text-slate-500">
              Escríbenos directamente por WhatsApp para consultar opciones flexibles o listas de espera.
            </p>
            <a
              href={buildWhatsAppUrl(buildGeneralWhatsAppMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-4 py-2 text-xs font-semibold text-white"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>Consultar opciones por WhatsApp</span>
            </a>
          </div>
        )}
      </section>

      {/* Sección de Paquetes Turísticos y Experiencias */}
      <section id="paquetes" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <Badge className="w-fit bg-purple-100 text-purple-700 ring-1 ring-purple-200">
              <Gift className="mr-1 h-3.5 w-3.5" /> Paquetes & Experiencias
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Planes y Paquetes Turísticos
            </h2>
            <p className="text-sm text-slate-500">
              Combina tu hospedaje con tours, cenas gourmet, spa y traslados con tarifas especiales.
            </p>
          </div>
          <a
            href={buildWhatsAppUrl(buildGeneralWhatsAppMessage())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors w-fit"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>Consultar paquete a medida</span>
          </a>
        </div>

        {paquetesLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : paquetes && paquetes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paquetes.map((pkg: Paquete) => {
              let pkgSubtotal = 0;
              if (pkg.servicios) {
                for (const s of pkg.servicios) {
                  const qty = s.PaqueteServicio?.cantidad || s.cantidad || 1;
                  pkgSubtotal += Number(s.precio) * qty;
                }
              }
              const desc = Number(pkg.descuento_porcentaje) || 0;
              const pkgTotal = pkgSubtotal * (1 - desc / 100);
              const waUrl = buildWhatsAppUrl(buildPackageWhatsAppMessage(pkg));

              return (
                <Card
                  key={pkg.id}
                  className="group flex flex-col justify-between overflow-hidden border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/5 hover:border-purple-200"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 text-2xl shadow-sm">
                        🎁
                      </div>
                      {desc > 0 && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs px-2.5 py-1 shadow-sm border-0">
                          -{desc}% dto.
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      {pkg.nombre}
                    </h3>
                    {pkg.descripcion && (
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {pkg.descripcion}
                      </p>
                    )}

                    {pkg.servicios && pkg.servicios.length > 0 && (
                      <div className="mt-5 space-y-2 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Servicios Adicionales Incluidos
                        </p>
                        <div className="space-y-1.5">
                          {pkg.servicios.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-xs text-slate-700"
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                <span>{(s.PaqueteServicio?.cantidad || s.cantidad || 1)}x {s.nombre}</span>
                              </span>
                              <span className="text-slate-500 font-medium ml-2 shrink-0">
                                {formatCurrency(Number(s.precio))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <div className="border-t border-slate-100 bg-slate-50/40 p-6 pt-4 flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400">Valor adicional</span>
                        {desc > 0 && (
                          <p className="text-xs text-slate-400 line-through">
                            {formatCurrency(pkgSubtotal)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-purple-700">
                          +{formatCurrency(pkgTotal)}
                        </span>
                      </div>
                    </div>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:shadow-emerald-600/30 active:scale-95"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      <span>Cotizar Paquete por WhatsApp</span>
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/50 py-12 text-center">
            <Gift className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No hay paquetes publicados actualmente</p>
          </div>
        )}
      </section>

      {/* Modal Detalle de Habitación */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        title={
          detailRoom
            ? `Habitación ${detailRoom.numero} · ${roomTypeLabels[detailRoom.tipo] ?? detailRoom.tipo
            }`
            : 'Detalle de habitación'
        }
        description={detailRoom?.descripcion}
        size="lg"
        footer={
          detailRoom ? (
            <>
              <div className="hidden text-left sm:block">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Precio por noche
                </p>
                <p className="text-2xl font-bold text-primary-700">
                  {formatCurrency(Number(detailRoom.precio_noche))}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    setDetailRoom(null);
                  }}
                >
                  Cerrar
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleBookViaWhatsApp(detailRoom);
                  }}
                  disabled={detailRoom.estado !== 'ACTIVA'}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-sm active:scale-95',
                    detailRoom.estado === 'ACTIVA'
                      ? 'bg-[#25D366] hover:bg-[#20ba59] shadow-emerald-600/20 hover:shadow-emerald-600/30'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  <span>Reservar por WhatsApp</span>
                </button>
              </div>
            </>
          ) : undefined
        }
      >
        {detailRoom ? (() => {
          const enrichedDetail = enrichRoomWithMedia(detailRoom);
          return (
            <div className="space-y-6">
              <ImageCarousel
                images={enrichedDetail.imagenes}
                aspect="video"
                autoplay
                intervalMs={5000}
                altPrefix={`Habitación ${detailRoom.numero}`}
              />

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Lo que incluye esta habitación
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {enrichedDetail.descripcion}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {enrichedDetail.amenidades.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : null}
      </Dialog>
    </div>
  );
}

export default HomePage;
