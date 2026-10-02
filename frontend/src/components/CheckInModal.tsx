'use client';

import * as React from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Hotel,
  User as UserIcon,
} from 'lucide-react';
import { Button, Dialog, Input, useToast } from './ui';
import {
  calculateNights,
  formatCurrency,
  formatDate,
  roomTypeLabels,
} from '../lib/utils';
import { checkInReservation } from '../services/reservation.service';
import type { Reservation } from '../types';

export interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  reserva: Reservation | null;
  onSuccess?: () => void;
}

export function CheckInModal({
  open,
  onClose,
  reserva,
  onSuccess,
}: CheckInModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [metodoPago, setMetodoPago] = React.useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO');
  const [montoCobro, setMontoCobro] = React.useState<number | string>(0);
  const [observaciones, setObservaciones] = React.useState('');

  const totalVal = reserva ? Number(reserva.precio_total) || 0 : 0;
  const anticipoPrevio = reserva ? Number(reserva.anticipo) || 0 : 0;
  const saldoPendiente = Math.max(0, +(totalVal - anticipoPrevio).toFixed(2));
  const noches = reserva ? calculateNights(reserva.fecha_inicio, reserva.fecha_fin) : 1;

  // Inicializar montos al abrir
  React.useEffect(() => {
    if (open && reserva) {
      setMontoCobro(saldoPendiente);
      setMetodoPago(reserva.metodo_pago || 'EFECTIVO');
      setObservaciones('');
    }
  }, [open, reserva, saldoPendiente]);

  const montoCobroNum = Math.max(0, Number(montoCobro) || 0);
  const nuevoSaldoRestante = Math.max(0, +(saldoPendiente - montoCobroNum).toFixed(2));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reserva) return;

    if (montoCobroNum > saldoPendiente) {
      toast.warning('Monto excedido', 'El monto a cobrar no puede exceder el saldo pendiente');
      return;
    }

    setSubmitting(true);
    try {
      const nuevoAnticipoTotal = Number((anticipoPrevio + montoCobroNum).toFixed(2));
      const detallePago = montoCobroNum > 0
        ? `Cobrado en check-in: $${montoCobroNum.toFixed(2)} (${metodoPago}). Saldo restante: $${nuevoSaldoRestante.toFixed(2)}`
        : 'Sin cobro en check-in';
      const obsFinal = observaciones.trim()
        ? `${detallePago} | Notas: ${observaciones.trim()}`
        : detallePago;

      await checkInReservation(reserva.id, {
        anticipo: nuevoAnticipoTotal,
        metodo_pago: metodoPago,
        observaciones: obsFinal,
      });

      toast.success(
        '¡Check-in realizado con éxito!',
        `El huésped ${reserva.usuario?.nombre || ''} ha ingresado a la Habitación ${reserva.habitacion?.numero || ''}.`
      );

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al procesar el check-in';
      toast.error('Error en check-in', msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!reserva) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Registrar Check-in — Hab. ${reserva.habitacion?.numero || '—'}`}
      description="Verifica la identidad del huésped, registra el cobro del saldo acordado y entrega la habitación."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="hidden sm:block text-xs text-slate-500">
            <span>Saldo restante post check-in: </span>
            <strong className={nuevoSaldoRestante > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
              {formatCurrency(nuevoSaldoRestante)}
            </strong>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant="default"
              type="submit"
              form="form-checkin"
              loading={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Confirmar Check-in {montoCobroNum > 0 ? `y Cobro (${formatCurrency(montoCobroNum)})` : ''}
            </Button>
          </div>
        </div>
      }
    >
      <form id="form-checkin" onSubmit={handleSubmit} className="space-y-4">
        {/* Resumen de la Estancia */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs text-slate-700">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <UserIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {reserva.cliente?.nombre || reserva.usuario?.nombre || 'Cliente'}
                  {reserva.cliente?.documento && (
                    <span className="ml-2 font-normal text-xs text-slate-500 font-mono">
                      (Doc: {reserva.cliente.documento})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">{reserva.cliente?.email || reserva.usuario?.email}</p>
                {reserva.acompanantes && reserva.acompanantes.length > 0 && (
                  <p className="text-[11px] text-primary-700 font-medium mt-0.5">
                    Acompañantes ({reserva.acompanantes.length}): {reserva.acompanantes.map((a) => a.nombre).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-800 text-sm">
                Hab. {reserva.habitacion?.numero || '—'}
              </span>
              <p className="text-[11px] text-slate-500">
                {reserva.habitacion?.tipo ? (roomTypeLabels[reserva.habitacion.tipo] || reserva.habitacion.tipo) : 'Habitación'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(reserva.fecha_inicio)} hasta {formatDate(reserva.fecha_fin)} ({noches} noches)
            </span>
            {reserva.paquete && (
              <span className="text-purple-700 font-medium">
                🎁 {reserva.paquete.nombre}
              </span>
            )}
          </div>
        </div>

        {/* Desglose de Saldos */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="border-r border-slate-100 pr-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Total</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{formatCurrency(totalVal)}</span>
          </div>
          <div className="border-r border-slate-100 pr-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Abono Previo</span>
            <span className="text-sm font-bold text-emerald-600 mt-0.5 block">{formatCurrency(anticipoPrevio)}</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Saldo Pendiente</span>
            <span className={`text-sm font-bold mt-0.5 block ${saldoPendiente > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {formatCurrency(saldoPendiente)}
            </span>
          </div>
        </div>

        {/* Registro de Cobro en Check-in */}
        {saldoPendiente > 0 ? (
          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Cobro en Mostrador / Liquidación en Check-in
            </label>

            <div className="space-y-2">
              <Input
                type="number"
                label="Monto a Cobrar Ahora ($ USD)"
                min="0"
                max={saldoPendiente}
                step="0.01"
                value={montoCobro}
                onChange={(e) => setMontoCobro(e.target.value)}
                leftIcon={<DollarSign className="h-4 w-4" />}
                placeholder="0.00"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMontoCobro(saldoPendiente)}
                  className="px-2.5 py-1 text-xs rounded bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-semibold"
                >
                  Cobrar Saldo Total ({formatCurrency(saldoPendiente)})
                </button>
                <button
                  type="button"
                  onClick={() => setMontoCobro(0)}
                  className="px-2.5 py-1 text-xs rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium"
                >
                  Sin Cobro Ahora ($0.00)
                </button>
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700">Método de Pago Utilizado</label>
              <div className="grid grid-cols-3 gap-2">
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
                      className={`cursor-pointer rounded-lg border p-2.5 transition-all text-left ${
                        isSelected
                          ? 'border-emerald-600 bg-white ring-1 ring-emerald-600 shadow-sm'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800">{m.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Esta reserva ya se encuentra <strong>100% pagada</strong>. No hay saldo pendiente de cobro.</span>
          </div>
        )}

        {/* Observaciones del Check-in */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">
            Observaciones o Notas de Entrega de Habitación
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Ej: Entregadas 2 llaves físicas, solicitó no molestar antes de las 10:00 AM..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}

export default CheckInModal;
