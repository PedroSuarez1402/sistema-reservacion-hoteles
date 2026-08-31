'use client';

import * as React from 'react';
import { Ban, CalendarClock, CheckCircle2, Trash2, XCircle } from 'lucide-react';
import { Button, Select } from './ui';
import type { SelectOption } from './ui/Select';
import {
  cn,
  calculateNights,
  formatCurrency,
  formatDate,
  reservationStatusStyles,
  roomTypeLabels,
} from '../lib/utils';
import type { Reservation, ReservationStatus } from '../types';

export interface ReservationTableProps {
  reservations: Reservation[] | undefined;
  isLoading?: boolean;
  isEmptyMessage?: string;
  isStaff?: boolean;
  showUserColumn?: boolean;
  showRoomInfo?: boolean;
  onCancel?: (reservation: Reservation) => void;
  onDelete?: (reservation: Reservation) => void;
  onStatusChange?: (id: string, estado: ReservationStatus) => void;
}

const statusChangeOptions: SelectOption[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

function canCancel(status: ReservationStatus): boolean {
  return status === 'PENDIENTE' || status === 'CONFIRMADA';
}

function ReservationTable({
  reservations,
  isLoading,
  isEmptyMessage = 'No hay reservaciones por mostrar',
  isStaff = false,
  showUserColumn = false,
  showRoomInfo = true,
  onCancel,
  onDelete,
  onStatusChange,
}: ReservationTableProps) {
  const rows = reservations ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              {showUserColumn ? (
                <th className="px-4 py-3 font-semibold">Cliente</th>
              ) : null}
              {showRoomInfo ? (
                <th className="px-4 py-3 font-semibold">Habitación</th>
              ) : null}
              <th className="px-4 py-3 font-semibold">Fechas</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  <div className="inline-flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin text-primary-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Cargando reservaciones...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-14 text-center text-slate-500"
                >
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <CalendarClock className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      {isEmptyMessage}
                    </p>
                    <p className="text-xs text-slate-400">
                      Las reservaciones aparecerán aquí
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const statusMeta = reservationStatusStyles[r.estado];
                const noches = calculateNights(r.fecha_inicio, r.fecha_fin);
                return (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      #{r.id.slice(0, 8)}
                    </td>
                    {showUserColumn ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium text-slate-800">
                            {r.usuario?.nombre ?? '—'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {r.usuario?.email ?? r.usuario_id}
                          </span>
                        </div>
                      </td>
                    ) : null}
                    {showRoomInfo ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium text-slate-800">
                            Hab. {r.habitacion?.numero ?? r.habitacion_id.slice(0, 6)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {r.habitacion?.tipo
                              ? roomTypeLabels[r.habitacion.tipo]
                              : r.habitacion?.tipo ?? ''}
                          </span>
                        </div>
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm text-slate-800">
                          {formatDate(r.fecha_inicio)} →{' '}
                          {formatDate(r.fecha_fin)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {noches} noche{noches === 1 ? '' : 's'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          statusMeta.className
                        )}
                      >
                        {r.estado === 'CONFIRMADA' ? (
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        ) : r.estado === 'CANCELADA' ? (
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                        ) : null}
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(Number(r.precio_total))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isStaff && onStatusChange ? (
                          <Select
                            className="h-9 w-36"
                            label=""
                            aria-label="Cambiar estado"
                            value={r.estado}
                            options={statusChangeOptions}
                            onChange={(e) =>
                              onStatusChange(r.id, e.target.value as ReservationStatus)
                            }
                          />
                        ) : null}
                        {canCancel(r.estado) && onCancel ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Ban className="h-4 w-4" />}
                            onClick={() => onCancel(r)}
                          >
                            Cancelar
                          </Button>
                        ) : null}
                        {isStaff && onDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="h-4 w-4 text-rose-600" />}
                            onClick={() => onDelete(r)}
                          >
                            Eliminar
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { ReservationTable };
