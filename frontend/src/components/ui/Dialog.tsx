'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 flex min-h-full items-start justify-center px-4 py-4 sm:px-6 sm:py-6">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative w-full max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200',
            'animate-in zoom-in-95 fade-in duration-200',
            sizes[size]
          )}
        >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="space-y-1">
            {title ? (
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}

export { Dialog };
