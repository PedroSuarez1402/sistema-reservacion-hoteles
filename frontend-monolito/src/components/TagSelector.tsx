'use client';

import * as React from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { Badge, Button, useToast } from './ui';
import { useCreateTag, useTags } from '../hooks/query/useTags';
import { cn } from '../lib/utils';
import type { Tag } from '../types';
import { TagModal } from './TagModal';

const MAX_TAGS_PER_ROOM = 20;

interface TagSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  maxItems?: number;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

function TagSelector({
  value,
  onChange,
  maxItems = MAX_TAGS_PER_ROOM,
  placeholder = 'Busca y selecciona etiquetas...',
  label,
  error,
  hint,
  disabled = false,
}: TagSelectorProps) {
  const toast = useToast();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [tagModalOpen, setTagModalOpen] = React.useState(false);

  const tagsQuery = useTags();
  const allTags = tagsQuery.data ?? [];

  const createTagMutation = useCreateTag({
    async onSuccess(data) {
      setTagModalOpen(false);
      const alreadySelected = value.includes(data.id);
      if (!alreadySelected && value.length < maxItems) {
        onChange([...value, data.id]);
      }
      toast.success('Etiqueta creada', `Se agregó "${data.nombre}" al catálogo`);
    },
  });

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTags = React.useMemo(
    () => allTags.filter((t) => value.includes(t.id)),
    [allTags, value]
  );

  const keyword = search.trim().toLowerCase();
  const filteredOptions = React.useMemo(() => {
    const base = keyword
      ? allTags.filter(
          (t) =>
            t.nombre.toLowerCase().includes(keyword) ||
            (t.descripcion ?? '').toLowerCase().includes(keyword)
        )
      : allTags;
    return base.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [allTags, keyword]);

  function toggleTag(tagId: string) {
    if (disabled) return;
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else if (value.length < maxItems) {
      onChange([...value, tagId]);
    } else {
      toast.warning(
        'Máximo alcanzado',
        `Puedes asignar máximo ${maxItems} etiquetas por habitación`
      );
    }
  }

  function removeChip(e: React.MouseEvent, tagId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter((id) => id !== tagId));
  }

  function focusAndOpen() {
    if (disabled) return;
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="w-full space-y-1.5" ref={wrapperRef}>
      {label ? (
        <label
          onClick={focusAndOpen}
          className={cn(
            'block text-sm font-medium text-slate-700',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          )}
        >
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          'flex min-h-[2.5rem] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 shadow-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-offset-0',
          disabled
            ? 'cursor-not-allowed opacity-60 border-slate-200 bg-slate-50'
            : error
              ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/30'
              : 'border-slate-300 focus-within:border-primary-500 focus-within:ring-primary-500/30'
        )}
        onClick={focusAndOpen}
        role="listbox"
        aria-expanded={open}
        aria-multiselectable="true"
      >
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="default"
            className="gap-1 pr-1"
            role="option"
            aria-selected="true"
          >
            <span className="truncate max-w-[16rem]">{tag.nombre}</span>
            {!disabled ? (
              <button
                type="button"
                aria-label={`Quitar etiqueta ${tag.nombre}`}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary-200 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                onClick={(e) => removeChip(e, tag.id)}
                tabIndex={disabled ? -1 : 0}
                disabled={disabled}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
          </Badge>
        ))}

        <div className="flex min-w-[12rem] flex-1 items-center gap-1">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="min-w-0 flex-1 bg-transparent px-0 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none disabled:cursor-not-allowed"
          />
        </div>

        {!disabled && tagsQuery.data ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTagModalOpen(true);
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            aria-label="Crear nueva etiqueta"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Nueva etiqueta
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div
          className="relative z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5"
          role="listbox"
        >
          {tagsQuery.isLoading ? (
            <div className="px-3 py-4 text-sm text-slate-500">
              Cargando catálogo de etiquetas...
            </div>
          ) : tagsQuery.isError ? (
            <div className="px-3 py-4 text-sm text-rose-600">
              No se pudo cargar el catálogo. Inténtalo de nuevo.
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">
              {search.trim()
                ? `No hay etiquetas que coincidan con "${search}".`
                : 'No hay etiquetas en el catálogo aún.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredOptions.map((tag) => {
                const isSelected = value.includes(tag.id);
                return (
                  <li
                    key={tag.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors',
                      isSelected
                        ? 'bg-primary-50/70 text-slate-900 hover:bg-primary-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'font-medium truncate',
                          isSelected ? 'text-slate-900' : 'text-slate-800'
                        )}
                      >
                        {tag.nombre}
                      </p>
                      {tag.descripcion ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {tag.descripcion}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : (
        <p className="text-xs text-slate-500">
          {selectedTags.length} de {maxItems} etiquetas asignadas.
        </p>
      )}

      <TagModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        onSubmit={async (payload) => {
          await createTagMutation.mutateAsync(payload as any);
        }}
        isLoading={createTagMutation.isPending}
      />
    </div>
  );
}

export type { Tag };
export { TagSelector };
