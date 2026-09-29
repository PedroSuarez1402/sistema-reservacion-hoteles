'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      label,
      hint,
      id,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const isPasswordField = type === 'password';
    const hasToggle = Boolean(showPasswordToggle && isPasswordField);

    const [internalType, setInternalType] = React.useState<
      'text' | 'password'
    >(isPasswordField ? 'password' : (type as 'text' | 'password'));

    React.useEffect(() => {
      if (isPasswordField && !showPasswordToggle) {
        setInternalType('password');
      }
    }, [isPasswordField, showPasswordToggle]);

    const resolvedType = hasToggle ? internalType : type;
    const showRightSlot = Boolean(rightIcon) || hasToggle;

    function handleToggleVisibility(e: React.MouseEvent<HTMLButtonElement>) {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setInternalType((prev) => (prev === 'password' ? 'text' : 'password'));
    }

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          {leftIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </span>
          ) : null}
          <input
            id={inputId}
            type={resolvedType}
            aria-invalid={Boolean(error)}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon ? 'pl-10' : '',
              showRightSlot ? 'pr-12' : '',
              error
                ? 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/30'
                : 'border-slate-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && !hasToggle ? (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightIcon}
            </span>
          ) : null}
          {hasToggle ? (
            <button
              type="button"
              onClick={handleToggleVisibility}
              disabled={disabled}
              aria-label={
                internalType === 'password'
                  ? 'Mostrar contraseña'
                  : 'Ocultar contraseña'
              }
              aria-pressed={internalType === 'text'}
              tabIndex={disabled ? -1 : 0}
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-1 focus:z-10',
                disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:text-slate-600 active:text-slate-700'
              )}
            >
              {internalType === 'password' ? (
                <Eye className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
