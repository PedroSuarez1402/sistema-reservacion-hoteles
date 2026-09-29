'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  error?: string;
  label?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string | number | undefined;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, label, hint, id, options, placeholder, value, ...props },
  ref
) {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          aria-invalid={Boolean(error)}
          className={cn(
            'flex h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-10 py-2 text-sm text-slate-900 shadow-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/30'
              : 'border-slate-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

export { Select };
