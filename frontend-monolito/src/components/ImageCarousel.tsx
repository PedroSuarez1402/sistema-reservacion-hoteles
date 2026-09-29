'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ImageCarouselProps {
  images: string[];
  altPrefix?: string;
  aspect?: 'video' | 'square' | 'photo' | 'card' | 'auto';
  autoplay?: boolean;
  intervalMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  rounded?: boolean;
  onClick?: (index: number) => void;
  className?: string;
  initialIndex?: number;
}

const aspectMap: Record<NonNullable<ImageCarouselProps['aspect']>, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  photo: 'aspect-[4/3]',
  card: 'aspect-[16/10]',
  auto: '',
};

function ImageCarousel({
  images,
  altPrefix = 'Imagen',
  aspect = 'photo',
  autoplay = false,
  intervalMs = 4500,
  showArrows = true,
  showDots = true,
  rounded = true,
  onClick,
  className,
  initialIndex = 0,
}: ImageCarouselProps) {
  const [index, setIndex] = React.useState<number>(() => {
    if (!images || images.length === 0) return 0;
    return Math.max(0, Math.min(initialIndex, images.length - 1));
  });

  const count = images?.length ?? 0;
  const canNavigate = count > 1;

  React.useEffect(() => {
    if (!canNavigate) return;
    if (index < 0) setIndex(0);
    else if (index >= count) setIndex(count - 1);
  }, [count, index, canNavigate]);

  React.useEffect(() => {
    if (count === 0) setIndex(0);
    else if (initialIndex >= 0 && initialIndex < count) setIndex(initialIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  function goNext() {
    if (!canNavigate) return;
    setIndex((prev) => (prev + 1) % count);
  }

  function goPrev() {
    if (!canNavigate) return;
    setIndex((prev) => (prev - 1 + count) % count);
  }

  React.useEffect(() => {
    if (!autoplay || !canNavigate) return;
    const id = window.setInterval(goNext, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, intervalMs, canNavigate, count]);

  React.useEffect(() => {
    if (!canNavigate) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canNavigate, count]);

  if (!images || count === 0) {
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400',
          aspectMap[aspect],
          rounded ? 'rounded-xl' : '',
          className
        )}
        aria-hidden="true"
      >
        <span className="text-xs uppercase tracking-widest">Sin imágenes</span>
      </div>
    );
  }

  const current = images[index] ?? '';

  return (
    <div
      className={cn(
        'group relative w-full select-none overflow-hidden bg-slate-100',
        aspectMap[aspect],
        rounded ? 'rounded-xl' : '',
        className
      )}
      onClick={() => onClick?.(index)}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${altPrefix} — ${index + 1} de ${count}`}
    >
      <div className="absolute inset-0">
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={`${altPrefix} ${i + 1} de ${count}`}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out',
              i === index
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105 pointer-events-none'
            )}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/10 pointer-events-none" />

      {canNavigate && showArrows ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Anterior"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full',
              'bg-white/80 text-slate-700 shadow-sm backdrop-blur transition-all duration-200',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
              'hover:bg-white active:bg-slate-50',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/40'
            )}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Siguiente"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full',
              'bg-white/80 text-slate-700 shadow-sm backdrop-blur transition-all duration-200',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
              'hover:bg-white active:bg-slate-50',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/40'
            )}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {canNavigate ? (
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          <span aria-hidden="true">🖼️</span>
          <span>{index + 1}/{count}</span>
        </div>
      ) : null}

      {canNavigate && showDots ? (
        <div
          className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
          role="tablist"
          aria-label="Seleccionar imagen"
        >
          {images.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Ir a imagen ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  active
                    ? 'w-6 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'
                    : 'w-1.5 bg-white/60 hover:bg-white/80'
                )}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export { ImageCarousel };
