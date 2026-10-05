'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Hotel,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Input,
  Select,
  useToast,
} from './ui';
import type { SelectOption } from './ui/Select';
import {
  calculateNights,
  formatCurrency,
  getTodayIso,
  getTomorrowIso,
  roomTypeLabels,
} from '../lib/utils';
import { useAllReservations, usePackages, useRooms } from '../hooks';
import clienteService from '../services/cliente.service';
import reservationService from '../services/reservation.service';
import type {
  Acompanante,
  Cliente,
  CreateReservationPayload,
  Paquete,
  Room,
} from '../types';

export interface RecepcionBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedRoom?: Room | null;
}

interface FormAcompanante {
  nombre: string;
  documento: string;
  parentesco: string;
  telefono: string;
}

export function RecepcionBookingModal({
  open,
  onClose,
  onSuccess,
  preselectedRoom,
}: RecepcionBookingModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: allRooms = [], isLoading: roomsLoading } = useRooms();
  const { data: allPackages = [], isLoading: packagesLoading } = usePackages();
  const { data: allReservations = [], isLoading: reservationsLoading } = useAllReservations();

  // Submission state
  const [submitting, setSubmitting] = React.useState(false);

  // Client Selection Mode: 'BUSCAR' (existente) vs 'NUEVO'
  const [modoCliente, setModoCliente] = React.useState<'BUSCAR' | 'NUEVO'>('BUSCAR');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Cliente[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedCliente, setSelectedCliente] = React.useState<Cliente | null>(null);

  // Client manual form states
  const [documento, setDocumento] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [telefono, setTelefono] = React.useState('');
  const [email, setEmail] = React.useState('');

  // Companions state
  const [tieneAcompanantes, setTieneAcompanantes] = React.useState(false);
  const [acompanantesList, setAcompanantesList] = React.useState<FormAcompanante[]>([]);

  // Dates and booking options
  const todayIso = getTodayIso();
  const tomorrowIso = getTomorrowIso();

  const [habitacionId, setHabitacionId] = React.useState<string>('');
  const [paqueteId, setPaqueteId] = React.useState<string>('');
  const [fechaInicio, setFechaInicio] = React.useState<string>(todayIso);
  const [fechaFin, setFechaFin] = React.useState<string>(tomorrowIso);
  const [tipoReserva, setTipoReserva] = React.useState<'INMEDIATA' | 'ANTICIPADA'>('INMEDIATA');
  const [metodoPago, setMetodoPago] = React.useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO');
  const [anticipo, setAnticipo] = React.useState<number | string>(0);
  const [observaciones, setObservaciones] = React.useState<string>('');

  // Live search for registered clients
  React.useEffect(() => {
    if (modoCliente !== 'BUSCAR' || !searchQuery.trim() || selectedCliente) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await clienteService.search(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Error buscando clientes:', err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, modoCliente, selectedCliente]);


  // Handle selecting an existing client
  function handleSelectCliente(cliente: Cliente) {
    setSelectedCliente(cliente);
    setDocumento(cliente.documento);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono || '');
    setEmail(cliente.email);
    setSearchQuery('');
    setSearchResults([]);

    // If client has registered companions, suggest activating companions
    if (cliente.acompanantes && cliente.acompanantes.length > 0) {
      // Keep existing or let user decide
    }
  }

  // Handle clearing selected client
  function handleClearSelectedCliente() {
    setSelectedCliente(null);
    setDocumento('');
    setNombre('');
    setTelefono('');
    setEmail('');
    setSearchQuery('');
  }

  // Switch to new client mode
  function handleSwitchToNuevo() {
    setModoCliente('NUEVO');
    setSelectedCliente(null);
    setDocumento('');
    setNombre('');
    setTelefono('');
    setEmail('');
  }

  // Switch to search client mode
  function handleSwitchToBuscar() {
    setModoCliente('BUSCAR');
    setSelectedCliente(null);
    setDocumento('');
    setNombre('');
    setTelefono('');
    setEmail('');
  }

  // Handle companion list management
  function handleAddAcompanante() {
    setTieneAcompanantes(true);
    setAcompanantesList((prev) => [
      ...prev,
      { nombre: '', documento: '', parentesco: 'Familiar', telefono: '' },
    ]);
  }

  function handleRemoveAcompanante(index: number) {
    setAcompanantesList((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateAcompanante(index: number, field: keyof FormAcompanante, value: string) {
    setAcompanantesList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleAddFrequentAcompanante(acomp: Acompanante) {
    setTieneAcompanantes(true);
    const exists = acompanantesList.some(
      (a) => a.nombre.toLowerCase().trim() === acomp.nombre.toLowerCase().trim()
    );
    if (!exists) {
      setAcompanantesList((prev) => [
        ...prev,
        {
          nombre: acomp.nombre,
          documento: acomp.documento || '',
          parentesco: acomp.parentesco || 'Familiar',
          telefono: acomp.telefono || '',
        },
      ]);
    }
  }

  // Handle tipo de reserva toggle
  function handleTipoReservaChange(tipo: 'INMEDIATA' | 'ANTICIPADA') {
    setTipoReserva(tipo);
    if (tipo === 'INMEDIATA') {
      setFechaInicio(todayIso);
      if (fechaFin <= todayIso) {
        setFechaFin(tomorrowIso);
      }
    }
  }

  // Filtrar habitaciones activas estrictamente disponibles en el rango [fechaInicio, fechaFin)
  // Condición de solapamiento hotelero: res.fecha_inicio < reqEnd && res.fecha_fin > reqStart
  // Si una reserva previa finaliza el mismo día de llegada (res.fecha_fin <= reqStart), NO hay solapamiento (turnaround)
  const availableRooms = React.useMemo(() => {
    const active = allRooms.filter((r) => r.estado === 'ACTIVA');
    if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) {
      return active;
    }

    const reqStart = fechaInicio.slice(0, 10);
    const reqEnd = fechaFin.slice(0, 10);

    const occupiedRoomIds = new Set<string>();

    for (const res of allReservations) {
      if (res.estado === 'CANCELADA' || res.estado === 'FINALIZADA') continue;
      if (!res.habitacion_id || !res.fecha_inicio || !res.fecha_fin) continue;

      const resStart = res.fecha_inicio.slice(0, 10);
      const resEnd = res.fecha_fin.slice(0, 10);

      if (resStart < reqEnd && resEnd > reqStart) {
        occupiedRoomIds.add(res.habitacion_id);
      }
    }

    return active.filter((r) => !occupiedRoomIds.has(r.id));
  }, [allRooms, allReservations, fechaInicio, fechaFin]);

  // Sincronización de habitación seleccionada según disponibilidad en las fechas
  React.useEffect(() => {
    if (!open) return;

    if (preselectedRoom && availableRooms.some((r) => r.id === preselectedRoom.id)) {
      setHabitacionId(preselectedRoom.id);
      return;
    }

    if (habitacionId) {
      const isStillAvailable = availableRooms.some((r) => r.id === habitacionId);
      if (!isStillAvailable) {
        setHabitacionId(availableRooms.length > 0 ? availableRooms[0].id : '');
      }
    } else if (availableRooms.length > 0) {
      setHabitacionId(availableRooms[0].id);
    }
  }, [open, availableRooms, habitacionId, preselectedRoom]);

  const selectedRoom = React.useMemo(() => {
    return allRooms.find((r) => r.id === habitacionId) || null;
  }, [allRooms, habitacionId]);

  const selectedPackage = React.useMemo(() => {
    return allPackages.find((p) => p.id === paqueteId) || null;
  }, [allPackages, paqueteId]);

  // Financial calculations (in USD)
  const noches = React.useMemo(() => {
    if (!fechaInicio || !fechaFin) return 1;
    return calculateNights(fechaInicio, fechaFin);
  }, [fechaInicio, fechaFin]);

  const habitacionSubtotal = React.useMemo(() => {
    if (!selectedRoom) return 0;
    return Number(selectedRoom.precio_noche) * noches;
  }, [selectedRoom, noches]);

  const paqueteTotal = React.useMemo(() => {
    if (!selectedPackage || !selectedPackage.servicios) return 0;
    let sub = 0;
    for (const s of selectedPackage.servicios) {
      const qty = s.PaqueteServicio?.cantidad || s.cantidad || 1;
      sub += Number(s.precio) * qty;
    }
    const desc = Number(selectedPackage.descuento_porcentaje) || 0;
    return sub * (1 - desc / 100);
  }, [selectedPackage]);

  const totalEstimado = Number((habitacionSubtotal + paqueteTotal).toFixed(2));
  const anticipoNum = Math.max(0, Number(anticipo) || 0);
  const saldoPendiente = Math.max(0, +(totalEstimado - anticipoNum).toFixed(2));

  // Quick payment amount buttons (USD)
  function applyFullPayment() {
    setAnticipo(totalEstimado);
  }
  function applyHalfPayment() {
    setAnticipo(+(totalEstimado * 0.5).toFixed(2));
  }
  function applyZeroPayment() {
    setAnticipo(0);
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!documento.trim()) {
      toast.warning('Documento requerido', 'Ingresa el número de documento de identidad del titular');
      return;
    }
    if (!nombre.trim() || nombre.trim().length < 2) {
      toast.warning('Datos incompletos', 'Ingresa el nombre completo del cliente');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.warning('Datos incompletos', 'Ingresa un correo electrónico válido');
      return;
    }
    if (!habitacionId) {
      toast.warning('Habitación requerida', 'Selecciona una habitación para la reserva');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      toast.warning('Fechas requeridas', 'Completa ambas fechas de estancia');
      return;
    }
    if (fechaFin <= fechaInicio) {
      toast.warning('Fechas inválidas', 'La fecha de salida debe ser posterior a la de llegada');
      return;
    }

    const anticipoValor = Math.max(0, Number(anticipo) || 0);
    if (anticipoValor < 0) {
      toast.warning('Monto de abono inválido', 'El anticipo no puede ser negativo');
      return;
    }
    if (anticipoValor > totalEstimado) {
      toast.warning('Monto de abono excedido', 'El anticipo no puede ser mayor que el total a cobrar ($ USD)');
      return;
    }

    // Filtrar acompañantes válidos
    const validAcompanantes = tieneAcompanantes
      ? acompanantesList
          .filter((a) => a.nombre && a.nombre.trim().length > 0)
          .map((a) => ({
            nombre: a.nombre.trim(),
            documento: a.documento.trim() || undefined,
            parentesco: a.parentesco.trim() || 'Familiar',
            telefono: a.telefono.trim() || undefined,
          }))
      : [];

    // Validar que no haya acompañantes repetidos
    if (tieneAcompanantes && validAcompanantes.length > 0) {
      const titularDoc = documento.trim().toLowerCase();
      const titularNom = nombre.trim().toLowerCase();
      const seenDocs = new Set<string>();
      const seenNoms = new Set<string>();

      for (let i = 0; i < validAcompanantes.length; i++) {
        const ac = validAcompanantes[i];
        const acDoc = ac.documento?.trim().toLowerCase();
        const acNom = ac.nombre.trim().toLowerCase();

        if (acDoc && titularDoc && acDoc === titularDoc) {
          toast.warning('Acompañante inválido', `El documento del acompañante coincide con el documento del cliente titular`);
          return;
        }
        if (acNom === titularNom) {
          toast.warning('Acompañante inválido', `El acompañante "${ac.nombre}" no puede ser el mismo cliente titular`);
          return;
        }
        if (acDoc) {
          if (seenDocs.has(acDoc)) {
            toast.warning('Acompañante duplicado', `El documento "${ac.documento}" está repetido entre los acompañantes`);
            return;
          }
          seenDocs.add(acDoc);
        }
        if (seenNoms.has(acNom)) {
          toast.warning('Acompañante duplicado', `El acompañante "${ac.nombre}" está registrado más de una vez`);
          return;
        }
        seenNoms.add(acNom);
      }
    }

    setSubmitting(true);
    try {
      // 1. Componer observaciones operativas de recepción
      const docText = documento.trim() ? `Doc: ${documento.trim()}` : '';
      const telText = telefono.trim() ? `Tel: ${telefono.trim()}` : '';
      const acompText = validAcompanantes.length > 0
        ? `Acompañantes (${validAcompanantes.length}): ${validAcompanantes.map((a) => a.nombre).join(', ')}`
        : '';
      const obsText = observaciones.trim() ? `Notas: ${observaciones.trim()}` : '';
      const infoHuesped = [docText, telText, acompText, obsText].filter(Boolean).join(' | ');
      const obsFinal = `[Reserva Asistida - Recepción] Cliente: ${nombre.trim()} (${email.trim()})${
        infoHuesped ? ` - ${infoHuesped}` : ''
      }`;

      // 2. Crear payload de la reservación
      const payload: CreateReservationPayload = {
        habitacion_id: habitacionId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        paquete_id: paqueteId || null,
        precio_total: totalEstimado,
        metodo_pago: metodoPago,
        tipo_reserva: tipoReserva,
        anticipo: anticipoValor,
        es_prorroga: false,
        observaciones_recepcion: obsFinal,
        acompanantes: validAcompanantes,
      };

      if (selectedCliente) {
        payload.cliente_id = selectedCliente.id;
      } else {
        payload.cliente_datos = {
          documento: documento.trim(),
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono.trim() || undefined,
        };
      }

      await reservationService.create(payload);

      toast.success(
        '¡Reserva registrada con éxito!',
        `Reserva para ${nombre.trim()} en Habitación ${selectedRoom?.numero || ''} guardada correctamente.`
      );

      // Refrescar consultas en React Query
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });

      // Limpiar estados y cerrar
      handleClearSelectedCliente();
      setTieneAcompanantes(false);
      setAcompanantesList([]);
      setObservaciones('');
      setAnticipo(0);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'No se pudo crear la reserva asistida';
      toast.error('Error al registrar reserva', msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Room select options (solo habitaciones disponibles para las fechas solicitadas)
  const roomOptions: SelectOption[] = React.useMemo(() => {
    return availableRooms.map((r) => ({
      value: r.id,
      label: `Habitación ${r.numero} — ${roomTypeLabels[r.tipo] || r.tipo} (${formatCurrency(
        Number(r.precio_noche)
      )}/noche)`,
    }));
  }, [availableRooms]);

  // Package select options
  const packageOptions: SelectOption[] = React.useMemo(() => {
    const opts: SelectOption[] = [{ value: '', label: '— Sin paquete turístico adicional —' }];
    for (const p of allPackages) {
      if (p.estado === 'ACTIVO') {
        const desc = Number(p.descuento_porcentaje) || 0;
        opts.push({
          value: p.id,
          label: `${p.nombre}${desc > 0 ? ` (-${desc}% dto)` : ''}`,
        });
      }
    }
    return opts;
  }, [allPackages]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar Reserva Asistida (Consola de Recepción)"
      description="Selecciona un cliente ya registrado o ingresa los datos de un nuevo cliente, sus acompañantes, habitación y método de pago."
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="hidden sm:block text-left text-xs text-slate-500">
            <span>Total Estadía: </span>
            <strong className="text-sm font-bold text-slate-900">
              {formatCurrency(totalEstimado)} USD
            </strong>
            {anticipoNum > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">
                (Abono: {formatCurrency(anticipoNum)} USD | Saldo: {formatCurrency(saldoPendiente)} USD)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant="default"
              type="submit"
              form="form-reserva-asistida"
              loading={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmar y Registrar Reserva
            </Button>
          </div>
        </div>
      }
    >
      <form id="form-reserva-asistida" onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de Reserva (Walk-in vs Anticipada) */}
        <div className="flex flex-col sm:flex-row gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => handleTipoReservaChange('INMEDIATA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              tipoReserva === 'INMEDIATA'
                ? 'bg-white shadow-sm ring-2 ring-emerald-500 text-emerald-800'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Inmediata (Walk-in / Hoy)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTipoReservaChange('ANTICIPADA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              tipoReserva === 'ANTICIPADA'
                ? 'bg-white shadow-sm ring-2 ring-primary-500 text-primary-800'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Calendar className="h-4 w-4 text-primary-600" />
            <span>Reserva Anticipada / WhatsApp</span>
          </button>
        </div>

        {/* Sección: Datos del Cliente Titular */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary-600" />
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                Cliente Titular de la Reserva
              </h4>
            </div>

            {/* Alternador Modo Cliente */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={handleSwitchToBuscar}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  modoCliente === 'BUSCAR'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Cliente Registrado
                </span>
              </button>

              <button
                type="button"
                onClick={handleSwitchToNuevo}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  modoCliente === 'NUEVO'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo Cliente
                </span>
              </button>
            </div>
          </div>

          {/* Sub-vista 1: Búsqueda de Cliente Registrado */}
          {modoCliente === 'BUSCAR' && (
            <div className="space-y-3">
              {!selectedCliente ? (
                <div className="relative">
                  <Input
                    label="Buscar Cliente en Base de Datos"
                    placeholder="Escribe documento (cédula/pasaporte), nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4 text-slate-400" />}
                    autoFocus
                  />

                  {/* Resultados flotantes */}
                  {searching && (
                    <div className="p-3 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl mt-1 shadow-md">
                      Buscando en clientes registrados...
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 space-y-1">
                      {searchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCliente(c)}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-primary-50/70 cursor-pointer transition-colors border border-transparent hover:border-primary-100"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              {c.nombre}
                              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Doc: {c.documento}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {c.email} {c.telefono ? `· Tel: ${c.telefono}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs text-primary-700 bg-primary-50">
                            Seleccionar
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {!searching && searchQuery.trim().length > 1 && searchResults.length === 0 && (
                    <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded-xl mt-1 border border-slate-200 flex items-center justify-between">
                      <span>No se encontró ningún cliente con ese criterio.</span>
                      <button
                        type="button"
                        onClick={handleSwitchToNuevo}
                        className="text-primary-600 font-semibold hover:underline"
                      >
                        + Registrar como nuevo cliente
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Tarjeta de Cliente Seleccionado */
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 relative transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-base">{selectedCliente.nombre}</h5>
                          <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            Cliente Registrado
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <strong>Doc:</strong> {selectedCliente.documento} · <strong>Email:</strong> {selectedCliente.email}
                          {selectedCliente.telefono ? ` · <strong>Tel:</strong> ${selectedCliente.telefono}` : ''}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelectedCliente}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cambiar
                    </Button>
                  </div>

                  {/* Acompañantes Frecuentes Sugeridos */}
                  {selectedCliente.acompanantes && selectedCliente.acompanantes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-100">
                      <p className="text-[11px] font-semibold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        Acompañantes registrados previamente con este cliente (clic para incluir):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCliente.acompanantes.map((ac) => {
                          const isAlreadyAdded = acompanantesList.some(
                            (item) => item.nombre.toLowerCase() === ac.nombre.toLowerCase()
                          );
                          return (
                            <button
                              key={ac.id}
                              type="button"
                              onClick={() => handleAddFrequentAcompanante(ac)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                                isAlreadyAdded
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                              }`}
                            >
                              {isAlreadyAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 text-slate-400" />}
                              <span>{ac.nombre} ({ac.parentesco || 'Familiar'})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Formulario editable (usado en NUEVO o para ver/ajustar datos) */}
          {(modoCliente === 'NUEVO' || !selectedCliente) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Documento de Identidad (CC / Pasaporte) *"
                placeholder="Ej: 1098765432"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
                leftIcon={<FileText className="h-4 w-4" />}
              />

              <Input
                label="Nombre Completo del Titular *"
                placeholder="Ej: María Rodríguez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                leftIcon={<UserIcon className="h-4 w-4" />}
              />

              <Input
                label="Teléfono / WhatsApp *"
                placeholder="Ej: 3181234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                leftIcon={<Phone className="h-4 w-4" />}
              />

              <Input
                type="email"
                label="Correo Electrónico *"
                placeholder="Ej: maria@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4" />}
              />
            </div>
          )}
        </div>

        {/* Sección: Acompañantes */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-600" />
              <label htmlFor="check-acompanantes" className="text-sm font-semibold text-slate-800 cursor-pointer">
                ¿Viaja con acompañantes? (Huéspedes adicionales)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="check-acompanantes"
                type="checkbox"
                checked={tieneAcompanantes}
                onChange={(e) => {
                  setTieneAcompanantes(e.target.checked);
                  if (e.target.checked && acompanantesList.length === 0) {
                    handleAddAcompanante();
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-slate-500">
                {tieneAcompanantes ? 'Activado' : 'Sin acompañantes'}
              </span>
            </div>
          </div>

          {tieneAcompanantes && (
            <div className="space-y-3 pt-2">
              {acompanantesList.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-2 bg-white rounded-lg border border-slate-200">
                  No has agregado acompañantes aún. Haz clic en el botón de abajo para añadir uno.
                </div>
              ) : (
                acompanantesList.map((ac, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600">
                          {idx + 1}
                        </span>
                        Acompañante #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAcompanante(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Eliminar acompañante"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2">
                        <Input
                          label="Nombre Completo *"
                          placeholder="Nombre y Apellidos"
                          value={ac.nombre}
                          onChange={(e) => handleUpdateAcompanante(idx, 'nombre', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Input
                          label="Documento"
                          placeholder="CC / Pasaporte"
                          value={ac.documento}
                          onChange={(e) => handleUpdateAcompanante(idx, 'documento', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Parentesco</label>
                        <select
                          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={ac.parentesco}
                          onChange={(e) => handleUpdateAcompanante(idx, 'parentesco', e.target.value)}
                        >
                          <option value="Familiar">Familiar</option>
                          <option value="Cónyuge">Cónyuge</option>
                          <option value="Hijo/a">Hijo/a</option>
                          <option value="Amigo/a">Amigo/a</option>
                          <option value="Colega">Colega</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAcompanante}
                className="w-full text-xs border-dashed text-slate-600 hover:text-primary-700 hover:border-primary-300"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Agregar otro acompañante
              </Button>
            </div>
          )}
        </div>

        {/* Sección: Acomodación y Paquetes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Hotel className="h-4 w-4 text-primary-600" />
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Habitación y Paquetes
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Habitación *</label>
              {roomsLoading || reservationsLoading ? (
                <div className="h-10 animate-pulse bg-slate-100 rounded-lg" />
              ) : (
                <>
                  <Select
                    options={roomOptions}
                    value={habitacionId}
                    onChange={(e) => setHabitacionId(e.target.value)}
                    placeholder={
                      availableRooms.length === 0
                        ? 'No hay habitaciones disponibles para estas fechas'
                        : 'Selecciona una habitación disponible'
                    }
                    disabled={availableRooms.length === 0}
                  />
                  {availableRooms.length === 0 ? (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      ⚠️ No hay habitaciones disponibles del {fechaInicio} al {fechaFin}. Modifica las fechas.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      ✓ {availableRooms.length} habitación{availableRooms.length === 1 ? '' : 'es'} disponible{availableRooms.length === 1 ? '' : 's'} en estas fechas.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Paquete Turístico (Opcional)</label>
              {packagesLoading ? (
                <div className="h-10 animate-pulse bg-slate-100 rounded-lg" />
              ) : (
                <Select
                  options={packageOptions}
                  value={paqueteId}
                  onChange={(e) => setPaqueteId(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sección: Fechas de Estancia */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="h-4 w-4 text-primary-600" />
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Fechas de Estadía ({noches} noche{noches === 1 ? '' : 's'})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              type="date"
              label="Fecha de Llegada (Check-in) *"
              min={todayIso}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />

            <Input
              type="date"
              label="Fecha de Salida (Check-out) *"
              min={fechaInicio || todayIso}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Sección: Método de Pago y Anticipo (USD) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <CreditCard className="h-4 w-4 text-primary-600" />
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Pago y Liquidación (Valores en Dólares - USD)
            </h4>
          </div>

          {/* Selector de Método de Pago */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Método de Pago Acordado</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'EFECTIVO', label: 'Efectivo', desc: 'Pago físico en mostrador' },
                { id: 'TRANSFERENCIA', label: 'Transferencia', desc: 'Nequi / Daviplata / Bancos' },
                { id: 'TARJETA', label: 'Tarjeta', desc: 'Datáfono Débito / Crédito' },
              ].map((m) => {
                const isSelected = metodoPago === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setMetodoPago(m.id as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA')}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{m.label}</span>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose y Anticipo en USD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Hospedaje ({noches} noches):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(habitacionSubtotal)} USD</span>
              </div>
              {selectedPackage && (
                <div className="flex justify-between text-purple-700">
                  <span>Paquete ({selectedPackage.nombre}):</span>
                  <span className="font-semibold">+{formatCurrency(paqueteTotal)} USD</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Total a Cobrar:</span>
                <span className="text-primary-700 font-extrabold">{formatCurrency(totalEstimado)} USD</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="number"
                label="Anticipo / Abono Recibido ($ USD)"
                min="0"
                max={totalEstimado}
                step="0.01"
                value={anticipo}
                onChange={(e) => setAnticipo(e.target.value)}
                leftIcon={<DollarSign className="h-4 w-4" />}
                placeholder="0.00"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyFullPayment}
                  className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  100% Total
                </button>
                <button
                  type="button"
                  onClick={applyHalfPayment}
                  className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  50% Abono
                </button>
                <button
                  type="button"
                  onClick={applyZeroPayment}
                  className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Sin Anticipo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Observaciones Adicionales */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Observaciones de Recepción / Notas del Huésped
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Ej: Solicitó cama adicional, llega en taxi a las 3:00 PM..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}

export default RecepcionBookingModal;
