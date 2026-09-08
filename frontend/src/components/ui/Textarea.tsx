'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, hint, id, disabled, rows = 4, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        ) : null}
        <textarea
          id={textareaId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          rows={rows}
          className={cn(
            'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors resize-y',
            'placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/30'
              : 'border-slate-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30',
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
