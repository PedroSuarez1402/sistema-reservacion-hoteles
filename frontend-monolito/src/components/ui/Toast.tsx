'use client';

import * as React from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  remove: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ duration = 4000, ...rest }) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, duration, ...rest }] }));
    if (duration > 0) {
      window.setTimeout(() => {
        get().remove(id);
      }, duration);
    }
    return id;
  },
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  success: (title, description) =>
    get().push({ type: 'success', title, description }),
  error: (title, description) =>
    get().push({ type: 'error', title, description, duration: 6000 }),
  warning: (title, description) =>
    get().push({ type: 'warning', title, description }),
  info: (title, description) =>
    get().push({ type: 'info', title, description }),
}));

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <AlertCircle className="h-5 w-5 text-rose-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info: <Info className="h-5 w-5 text-sky-500" />,
};

const bgMap: Record<ToastType, string> = {
  success:
    'border-emerald-200 bg-emerald-50/80',
  error: 'border-rose-200 bg-rose-50/80',
  warning: 'border-amber-200 bg-amber-50/80',
  info: 'border-sky-200 bg-sky-50/80',
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-lg shadow-slate-900/5 backdrop-blur-sm',
        bgMap[toast.type]
      )}
    >
      <div className="flex gap-3 p-4">
        <div className="flex-shrink-0">{iconMap[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 text-sm text-slate-600">{toast.description}</p>
          ) : null}
        </div>
        <button
          onClick={() => remove(toast.id)}
          aria-label="Cerrar notificación"
          className="flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:top-6 sm:right-6 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

export function useToast() {
  const state = useToastStore();
  return React.useMemo(
    () => ({
      toast: state.push,
      success: state.success,
      error: state.error,
      warning: state.warning,
      info: state.info,
      dismiss: state.remove,
    }),
    [state]
  );
}
