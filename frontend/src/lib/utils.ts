import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateNights(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffMs = fin.getTime() - inicio.getTime();
  return Math.max(1, Math.ceil(diffMs / 86400000));
}

export function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export const reservationStatusStyles: Record<
  string,
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    className:
      'bg-amber-100 text-amber-800 border border-amber-200',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    className:
      'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  CANCELADA: {
    label: 'Cancelada',
    className: 'bg-rose-100 text-rose-800 border border-rose-200',
  },
  FINALIZADA: {
    label: 'Finalizada',
    className:
      'bg-slate-100 text-slate-700 border border-slate-200',
  },
};

export const roomStatusStyles: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVA: {
    label: 'Activa',
    className:
      'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento',
    className: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  ELIMINADA: {
    label: 'Eliminada',
    className: 'bg-slate-200 text-slate-600 border border-slate-300',
  },
};

export const roomTypeLabels: Record<string, string> = {
  SENCILLA: 'Sencilla',
  DOBLE: 'Doble',
  SUITE: 'Suite',
};

export const roleLabels: Record<string, string> = {
  HUESPED: 'Huésped',
  ADMIN: 'Administrador',
  RECEPCION: 'Recepción',
};
