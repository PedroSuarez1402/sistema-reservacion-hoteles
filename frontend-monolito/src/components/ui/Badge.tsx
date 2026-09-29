'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'gray';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default:
    'bg-primary-50 text-primary-700 border border-primary-200',
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning:
    'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
  gray: 'bg-slate-100 text-slate-700 border border-slate-200',
  outline:
    'bg-transparent text-slate-600 border border-slate-300',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
