'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  perPage?: number;
  onChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
  isFetching?: boolean;
}

function getPageRange(current: number, total: number, maxVisible = 7): (number | 'dots')[] {
  if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'dots')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push('dots');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('dots');
  pages.push(total);
  return pages;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      page,
      totalPages,
      totalItems,
      perPage,
      onChange,
      className,
      showInfo = true,
      isFetching = false,
    },
    ref
  ) => {
    const safePage = Math.max(1, Math.min(totalPages, Number.isFinite(page) ? page : 1));
    const safeTotal = Math.max(1, Number.isFinite(totalPages) ? totalPages : 1);
    const range = getPageRange(safePage, safeTotal);

    const startItem = totalItems && perPage ? (safePage - 1) * perPage + 1 : 0;
    const endItem = totalItems && perPage ? Math.min(safePage * perPage, totalItems) : 0;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          className
        )}
      >
        {showInfo ? (
          <div className="text-xs text-slate-500 sm:text-sm">
            {totalItems !== undefined && totalItems > 0 ? (
              <>
                Mostrando{' '}
                <span className="font-medium text-slate-700">{startItem}</span>
                {' - '}
                <span className="font-medium text-slate-700">{endItem}</span>
                {' de '}
                <span className="font-medium text-slate-700">{totalItems}</span>
              </>
            ) : (
              <span className="italic text-slate-400">Sin resultados</span>
            )}
          </div>
        ) : null}
        <div className="flex items-center gap-1 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(safePage - 1)}
            disabled={safePage <= 1 || isFetching}
            aria-label="Página anterior"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            className="!px-2"
          >
            <span className="sr-only">Anterior</span>
          </Button>
          {range.map((p, idx) =>
            p === 'dots' ? (
              <span
                key={`dots-${idx}`}
                aria-hidden="true"
                className="inline-flex h-9 min-w-[2.25rem] items-center justify-center px-2 text-sm text-slate-400"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                type="button"
                variant={p === safePage ? 'primary' : 'outline'}
                size="sm"
                disabled={isFetching}
                onClick={() => onChange(p)}
                aria-current={p === safePage ? 'page' : undefined}
                aria-label={`Ir a página ${p}`}
                className={cn(
                  '!h-9 !min-w-[2.25rem] !px-3',
                  p === safePage && 'pointer-events-none shadow-sm'
                )}
              >
                {p}
              </Button>
            )
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(safePage + 1)}
            disabled={safePage >= safeTotal || isFetching}
            aria-label="Página siguiente"
            rightIcon={<ChevronRight className="h-4 w-4" />}
            className="!px-2"
          >
            <span className="sr-only">Siguiente</span>
          </Button>
        </div>
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';

export { Pagination };
