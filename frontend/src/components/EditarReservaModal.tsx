'use client';

import * as React from 'react';
import {
  Banknote,
  Calendar,
  CreditCard,
  DollarSign,
  Gift,
  Hotel,
  Save,
  User as UserIcon,
} from 'lucide-react';
import { Button, Dialog, Input, Select, useToast } from './ui';
import type { SelectOption } from './ui/Select';
import {
  calculateNights,
  formatCurrency,
  roomTypeLabels,
} from '../lib/utils';
import { usePackages, useRooms } from '../hooks';
import { updateReservation } from '../services/reservation.service';
import type { Reservation, Room } from '../types';

export interface EditarReservaModalProps {
  open: boolean;
  onClose: () => void;
  reserva: Reservation | null;
  onSuccess?: () => void;
}

export function EditarReservaModal({
  open,
  onClose,
  reserva,
  onSuccess,
}: EditarReservaModalProps) {
  const toast = useToast();
  const { data: allRooms = [] } = useRooms();
  const { data: allPackages = [] } = usePackages();

  const [submitting, setSubmitting] = React.useState(false);
  const [habitacionId, setHabitacionId] = React.useState('');
  const [paqueteId, setPaqueteId] = React.useState('');
  const [fechaInicio, setFechaInicio] = React.useState('');
  const [fechaFin, setFechaFin] = React.useState('');
  const [metodoPago, setMetodoPago] = React.useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO');
  const [anticipo, setAnticipo] = React.useState<number | string>(0);
  const [observaciones, setObservaciones] = React.useState('');

  // Sincronizar al abrir modal
  React.useEffect(() => {
    if (open && reserva) {
      setHabitacionId(reserva.habitacion_id);
      setPaqueteId(reserva.paquete_id || '');
      setFechaInicio(reserva.fecha_inicio.substring(0, 10));
      setFechaFin(reserva.fecha_fin.substring(0, 10));
      setMetodoPago(reserva.metodo_pago || 'EFECTIVO');
      setAnticipo(Number(reserva.anticipo) || 0);
      setObservaciones(reserva.observaciones_recepcion || reserva.notas || '');
    }
  }, [open, reserva]);

  // Habitación seleccionada
  const selectedRoom = React.useMemo(() => {
    return allRooms.find((r) => r.id === habitacionId) || reserva?.habitacion || null;
  }, [allRooms, habitacionId, reserva]);

  // Paquete seleccionado
  const selectedPackage = React.useMemo(() => {
    if (!paqueteId) return null;
    return allPackages.find((p) => p.id === paqueteId) || null;
  }, [allPackages, paqueteId]);

  // Cálculos dinámicos
  const noches = React.useMemo(() => {
    if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) return 1;
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

  function applyFullPayment() {
    setAnticipo(totalEstimado);
  }
  function applyHalfPayment() {
    setAnticipo(+(totalEstimado * 0.5).toFixed(2));
  }
  function applyZeroPayment() {
    setAnticipo(0);
  }

  // Opciones de habitaciones: activas + la actual de la reserva
  const roomOptions: SelectOption[] = React.useMemo(() => {
    const available = allRooms.filter(
      (r) => r.estado === 'ACTIVA' || r.id === reserva?.habitacion_id
    );
    return available.map((r) => ({
      value: r.id,
      label: `Habitación ${r.numero} — ${roomTypeLabels[r.tipo] || r.tipo} (${formatCurrency(Number(r.precio_noche))}/noche)`,
    }));
  }, [allRooms, reserva]);

  // Opciones de paquetes
  const packageOptions: SelectOption[] = React.useMemo(() => {
    const opts: SelectOption[] = [{ value: '', label: '— Sin paquete turístico —' }];
    for (const p of allPackages) {
      if (p.estado === 'ACTIVO' || p.id === reserva?.paquete_id) {
        const desc = Number(p.descuento_porcentaje) || 0;
        opts.push({
          value: p.id,
          label: `${p.nombre}${desc > 0 ? ` (-${desc}% dto)` : ''}`,
        });
      }
    }
    return opts;
  }, [allPackages, reserva]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reserva) return;

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
    if (anticipoNum < 0) {
      toast.warning('Monto de abono inválido', 'El anticipo no puede ser negativo');
      return;
    }
    if (anticipoNum > totalEstimado) {
      toast.warning('Monto de abono excedido', 'El anticipo no puede ser mayor que el total a cobrar');
      return;
    }

    setSubmitting(true);
    try {
      await updateReservation(reserva.id, {
        habitacion_id: habitacionId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        paquete_id: paqueteId || null,
        precio_total: totalEstimado,
        metodo_pago: metodoPago,
        anticipo: anticipoNum,
        observaciones_recepcion: observaciones.trim() || undefined,
      });

      toast.success(
        '¡Reserva actualizada!',
        `Se guardaron correctamente los cambios para la reserva de ${reserva.usuario?.nombre || 'el huésped'}.`
      );

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al actualizar la reservación';
      toast.error('Error al editar reserva', msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!reserva) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Editar Reservación — ${reserva.usuario?.nombre || 'Huésped'}`}
      description="Modifica la habitación asignada, fechas de estancia, paquete, pagos y notas operativas."
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="hidden sm:block text-xs text-slate-500">
            <span>Total: </span>
            <strong className="text-sm font-bold text-slate-900">{formatCurrency(totalEstimado)}</strong>
            {anticipoNum > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">
                (Abono: {formatCurrency(anticipoNum)} | Saldo: {formatCurrency(saldoPendiente)})
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
              form="form-editar-reserva"
              loading={submitting}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
              leftIcon={<Save className="h-4 w-4" />}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      }
    >
      <form id="form-editar-reserva" onSubmit={handleSubmit} className="space-y-5">
        {/* Identificación del Cliente */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 font-bold">
            <UserIcon className="h-5 w-5" />
          </span>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900 text-sm">
              {reserva.cliente?.nombre || reserva.usuario?.nombre || 'Cliente'}
              {reserva.cliente?.documento && (
                <span className="ml-2 font-normal text-xs text-slate-500 font-mono">
                  (Doc: {reserva.cliente.documento})
                </span>
              )}
            </p>
            <p className="text-slate-500">
              {reserva.cliente?.email || reserva.usuario?.email || 'Sin correo registrado'}
              {reserva.cliente?.telefono ? ` · Tel: ${reserva.cliente.telefono}` : ''}
            </p>
            {reserva.acompanantes && reserva.acompanantes.length > 0 && (
              <p className="text-[11px] text-primary-700 font-medium pt-1">
                Acompañantes registrados ({reserva.acompanantes.length}):{' '}
                {reserva.acompanantes.map((a) => `${a.nombre} (${a.parentesco || 'Familiar'})`).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Sección: Habitación y Paquete */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Habitación Asignada *"
            options={roomOptions}
            value={habitacionId}
            onChange={(e) => setHabitacionId(e.target.value)}
          />
          <Select
            label="Paquete Turístico Adicional"
            options={packageOptions}
            value={paqueteId}
            onChange={(e) => setPaqueteId(e.target.value)}
          />
        </div>

        {/* Sección: Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Fecha de Entrada *"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            leftIcon={<Calendar className="h-4 w-4" />}
          />
          <Input
            type="date"
            label="Fecha de Salida *"
            min={fechaInicio}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            leftIcon={<Calendar className="h-4 w-4" />}
          />
        </div>

        {/* Método de Pago */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Método de Pago Acordado</label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'EFECTIVO', label: 'Efectivo', desc: 'En mostrador', icon: Banknote },
                { id: 'TRANSFERENCIA', label: 'Transferencia', desc: 'Nequi / Bancos', icon: DollarSign },
                { id: 'TARJETA', label: 'Tarjeta', desc: 'Datáfono', icon: CreditCard },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const isSelected = metodoPago === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setMetodoPago(m.id)}
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{m.label}</span>
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liquidación y Anticipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Hospedaje ({noches} noches):</span>
              <span className="font-semibold text-slate-800">{formatCurrency(habitacionSubtotal)}</span>
            </div>
            {selectedPackage && (
              <div className="flex justify-between text-purple-700">
                <span>Paquete ({selectedPackage.nombre}):</span>
                <span className="font-semibold">+{formatCurrency(paqueteTotal)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
              <span>Total a Cobrar:</span>
              <span className="text-primary-700">{formatCurrency(totalEstimado)}</span>
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
                className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 hover:bg-slate-50 font-medium text-slate-700"
              >
                100% Total
              </button>
              <button
                type="button"
                onClick={applyHalfPayment}
                className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 hover:bg-slate-50 font-medium text-slate-700"
              >
                50% Abono
              </button>
              <button
                type="button"
                onClick={applyZeroPayment}
                className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 hover:bg-slate-50 font-medium text-slate-700"
              >
                Sin Anticipo
              </button>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Observaciones de Recepción / Notas
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Notas del huésped o de la recepción..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}

export default EditarReservaModal;
