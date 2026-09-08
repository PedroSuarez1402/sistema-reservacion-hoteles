'use client';

import * as React from 'react';
import { CalendarClock, Crown, Pencil, Trash2, Users } from 'lucide-react';
import { Badge, Button } from './ui';
import type { SelectOption } from './ui/Select';
import {
  cn,
  formatCurrency,
  formatDate,
  reservationStatusStyles,
  roleStyles,
} from '../lib/utils';
import type { ClientListItem, User, UserRole } from '../types';

export interface ClientesTableProps {
  clients: ClientListItem[] | undefined;
  isLoading?: boolean;
  isEmptyMessage?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (client: ClientListItem) => void;
  onDelete?: (client: ClientListItem) => void;
}

const rolFilterOptions: (SelectOption & { value: UserRole | 'all' })[] = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'HUESPED', label: 'Huéspedes' },
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'ADMIN', label: 'Administradores' },
];

export { rolFilterOptions };

function ClientesTable({
  clients,
  isLoading,
  isEmptyMessage = 'No hay clientes por mostrar',
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
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Reservas</th>
              <th className="px-4 py-3 font-semibold text-right">Ingreso total</th>
              <th className="px-4 py-3 font-semibold">Última reserva</th>
              <th className="px-4 py-3 font-semibold">Registrado</th>
              {hasActions ? (
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={hasActions ? 7 : 6}
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
                    Cargando clientes...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={hasActions ? 7 : 6}
                  className="px-4 py-14 text-center text-slate-500"
                >
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <Users className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      {isEmptyMessage}
                    </p>
                    <p className="text-xs text-slate-400">
                      Los clientes que se registren aparecerán aquí
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
                rows.map((c) => {
                  const roleMeta = roleStyles[c.rol] ?? roleStyles.HUESPED;
                  const ultEstado = c.ultima_reserva_estado
                    ? reservationStatusStyles[c.ultima_reserva_estado]
                    : null;
                  const isVIP =
                    c.ingreso_total !== null && Number(c.ingreso_total) > 0 &&
                    c.reservaciones_count >= 3;
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white shadow-sm ring-2 ring-white">
                            {c.nombre
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">
                                {c.nombre}
                              </span>
                              {isVIP ? (
                                <Crown
                                  className="h-3.5 w-3.5 text-amber-500"
                                  aria-label="Cliente VIP (3+ reservas)"
                                />
                              ) : null}
                            </div>
                            <span className="text-xs text-slate-500">
                              {c.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', roleMeta.className)}
                        >
                          {roleMeta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                            c.reservaciones_count > 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-slate-50 text-slate-400'
                          )}
                        >
                          {c.reservaciones_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            c.ingreso_total !== null && Number(c.ingreso_total) > 0
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          )}
                        >
                          {c.ingreso_total !== null
                            ? formatCurrency(Number(c.ingreso_total))
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.ultima_reserva_fecha ? (
                          <div className="flex flex-col leading-tight gap-1">
                            <span className="text-xs text-slate-600">
                              {formatDate(c.ultima_reserva_fecha)}
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
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {c.createdAt ? formatDate(c.createdAt) : '—'}
                        </span>
                      </td>
                      {hasActions ? (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEdit?.(c)}
                                aria-label="Editar cliente"
                                className="px-2"
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
