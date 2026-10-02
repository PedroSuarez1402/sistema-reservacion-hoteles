'use client';

import * as React from 'react';
import { CalendarClock, Crown, Pencil, Trash2, Users, FileText, Phone, Mail, UserCheck } from 'lucide-react';
import { Badge, Button } from './ui';
import {
  cn,
  formatCurrency,
  formatDate,
  reservationStatusStyles,
} from '../lib/utils';
import type { Cliente, Acompanante, Reservation } from '../types';

export const rolFilterOptions = [
  { value: 'all', label: 'Todos los clientes' },
];

export interface ClientesTableProps {
  clients: Cliente[] | undefined;
  isLoading?: boolean;
  isEmptyMessage?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (client: Cliente) => void;
  onDelete?: (client: Cliente) => void;
}

function ClientesTable({
  clients,
  isLoading,
  isEmptyMessage = 'No hay clientes registrados',
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: ClientesTableProps) {
  const rows = clients ?? [];
  const hasActions = canEdit || canDelete;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Cliente Titular</th>
              <th className="px-4 py-3.5 font-semibold">Documento</th>
              <th className="px-4 py-3.5 font-semibold">Acompañantes</th>
              <th className="px-4 py-3.5 font-semibold text-center">Reservas</th>
              <th className="px-4 py-3.5 font-semibold text-right">Inversión Total</th>
              <th className="px-4 py-3.5 font-semibold">Última Reserva</th>
              <th className="px-4 py-3.5 font-semibold">Registrado</th>
              {hasActions ? (
                <th className="px-4 py-3.5 font-semibold text-right">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={hasActions ? 8 : 7}
                  className="px-4 py-12 text-center text-slate-500"
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
                    Cargando base de clientes...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={hasActions ? 8 : 7}
                  className="px-4 py-14 text-center text-slate-500"
                >
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <Users className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      {isEmptyMessage}
                    </p>
                    <p className="text-xs text-slate-400">
                      Los clientes registrados en recepción o creados manualmente aparecerán aquí.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const reservas = c.reservaciones ?? [];
                const reservasCount = c.reservaciones_count ?? reservas.length;
                const totalGasto = reservas.reduce(
                  (sum, r) => sum + (Number(r.precio_total) || 0),
                  0
                );
                const acompanantes = c.acompanantes ?? [];
                const isVIP = reservasCount >= 3 || totalGasto >= 500;

                // Ultima reserva
                const ultReserva = reservas[0];
                const ultEstado = ultReserva?.estado
                  ? reservationStatusStyles[ultReserva.estado]
                  : null;

                return (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    {/* Cliente Titular */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-indigo-700 text-sm font-bold text-white shadow-sm ring-2 ring-white">
                          {c.nombre
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900">
                              {c.nombre}
                            </span>
                            {isVIP ? (
                              <span title="Cliente VIP (+3 reservas o +$500)">
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>{c.email}</span>
                            {c.telefono ? (
                              <>
                                <span>•</span>
                                <span>{c.telefono}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Documento */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="rounded-lg border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 shadow-2xs"
                      >
                        {c.documento}
                      </Badge>
                    </td>

                    {/* Acompañantes */}
                    <td className="px-4 py-3">
                      {acompanantes.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="warning"
                            className="w-fit rounded-full bg-amber-50 text-amber-800 border-amber-200 border text-[11px] font-medium"
                          >
                            <Users className="h-3 w-3 mr-1 inline" />
                            {acompanantes.length} {acompanantes.length === 1 ? 'acompañante' : 'acompañantes'}
                          </Badge>
                          <span
                            className="text-[11px] text-slate-500 truncate max-w-[180px]"
                            title={acompanantes.map((a) => `${a.nombre} (${a.parentesco || 'Acompañante'})`).join(', ')}
                          >
                            {acompanantes.map((a) => a.nombre).slice(0, 2).join(', ')}
                            {acompanantes.length > 2 ? ` y ${acompanantes.length - 2} más` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin acompañantes</span>
                      )}
                    </td>

                    {/* Reservas */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          reservasCount > 0
                            ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                            : 'bg-slate-100 text-slate-400'
                        )}
                      >
                        {reservasCount}
                      </span>
                    </td>

                    {/* Inversión total */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          totalGasto > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'
                        )}
                      >
                        {totalGasto > 0 ? formatCurrency(totalGasto) : '—'}
                      </span>
                    </td>

                    {/* Última reserva */}
                    <td className="px-4 py-3">
                      {ultReserva ? (
                        <div className="flex flex-col leading-tight gap-1">
                          <span className="text-xs text-slate-700 font-medium">
                            {formatDate(ultReserva.fecha_inicio)}
                          </span>
                          {ultEstado ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'w-fit rounded-full border px-2 py-0 text-[10px] font-medium',
                                ultEstado.className
                              )}
                            >
                              {ultEstado.label}
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Sin reservas
                        </span>
                      )}
                    </td>

                    {/* Registrado */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {c.createdAt ? formatDate(c.createdAt) : '—'}
                      </span>
                    </td>

                    {/* Acciones */}
                    {hasActions ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEdit?.(c)}
                              aria-label="Editar cliente"
                              className="px-2 hover:bg-primary-50 hover:text-primary-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete?.(c)}
                              aria-label="Eliminar cliente"
                              className="px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
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

export { ClientesTable };
export default ClientesTable;
