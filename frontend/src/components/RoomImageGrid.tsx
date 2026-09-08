'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Star,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { Button, Dialog } from './ui';
import { useToast } from './ui/Toast';
import { cn, formatBytes } from '../lib/utils';
import {
  useReorderRoomImages,
  useSetMainRoomImage,
  useDeleteRoomImage,
  useRoom,
} from '../hooks';
import type { RoomImage } from '../types';

interface RoomImageGridProps {
  roomId: string;
  images?: RoomImage[];
  className?: string;
}

function getImagesOrDefault(images: RoomImage[] | undefined): RoomImage[] {
  if (!Array.isArray(images)) return [];
  return [...images].sort((a, b) => {
    const oa = Number.isFinite(a.orden) ? a.orden : 0;
    const ob = Number.isFinite(b.orden) ? b.orden : 0;
    if (oa !== ob) return oa - ob;
    return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
  });
}

export function RoomImageGrid({ roomId, images, className }: RoomImageGridProps) {
  const { data: roomFresh } = useRoom(roomId, { enabled: !images || images.length === 0 });
  const sourceImages = useMemo(
    () => getImagesOrDefault(images ?? roomFresh?.imagenes as RoomImage[] | undefined),
    [images, roomFresh]
  );
  const imageIds = useMemo(() => sourceImages.map((i) => i.id), [sourceImages]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RoomImage | null>(null);
  const { success, error: toastError, warning } = useToast();

  const reorderMutation = useReorderRoomImages({
    onError(err) {
      toastError('No se pudo actualizar el orden', (err as any)?.message || undefined);
    },
  });
  const setMainMutation = useSetMainRoomImage({
    onError(err) {
      toastError('No se pudo marcar como principal', (err as any)?.message || undefined);
    },
    onSuccess() {
      success('Imagen principal actualizada');
    },
  });
  const deleteMutation = useDeleteRoomImage({
    onError(err) {
      toastError('No se pudo eliminar la imagen', (err as any)?.message || undefined);
    },
    onSuccess() {
      success('Imagen eliminada correctamente');
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = imageIds.indexOf(String(active.id));
    const newIdx = imageIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
    const moved = arrayMove(imageIds, oldIdx, newIdx);
    try {
      await reorderMutation.mutateAsync({ roomId, ids: moved });
    } catch {
      // already toasted
    }
  }

  async function handleSetMain(imageId: string) {
    try {
      await setMainMutation.mutateAsync({ roomId, imageId });
    } catch {
      // toasted
    }
  }

  function openDeleteConfirm(img: RoomImage) {
    setPendingDelete(img);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ roomId, imageId: pendingDelete.id });
      setPendingDelete(null);
    } catch {
      // toasted
    }
  }

  if (sourceImages.length === 0) {
    return (
      <section className={cn('space-y-3', className)} aria-label="Galería de imágenes">
        <header>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />
            Imágenes de la habitación
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define el orden, marca la imagen principal y elimina imágenes existentes.
          </p>
        </header>
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center"
          aria-hidden="true"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm text-slate-400 ring-1 ring-slate-200">
            <ImageIcon className="h-7 w-7" />
          </div>
          <div className="space-y-0.5 max-w-sm">
            <p className="text-sm font-medium text-slate-700">Aún no hay imágenes</p>
            <p className="text-xs text-slate-500">
              Sube la(s) primera(s) imagen(es) en la sección superior. La primera se marcará automáticamente como principal.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Galería de imágenes">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />
            Imágenes de la habitación
            <span className="text-xs font-normal text-slate-500">
              · {sourceImages.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Arrastra para reordenar · ⭐ para marcar la principal · 🗑️ para eliminar
          </p>
        </div>
        {sourceImages.length > 1 && !sourceImages.some((i) => i.es_principal) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs h-8 px-2.5"
            onClick={() => handleSetMain(sourceImages[0].id)}
          >
            ⭐ Marcar la primera como principal
          </Button>
        ) : null}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={imageIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sourceImages.map((img, idx) => (
              <SortableImageCard
                key={img.id}
                image={img}
                index={idx}
                isActive={activeId === img.id}
                onSetMain={() => handleSetMain(img.id)}
                onDelete={() => openDeleteConfirm(img)}
                reordering={reorderMutation.isPending}
                settingMain={setMainMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="¿Eliminar imagen?"
        description={
          pendingDelete
            ? `Se eliminará "${pendingDelete.nombre_original || 'la imagen'}". Esta acción no se puede deshacer.`
            : ''
        }
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={confirmDelete}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {pendingDelete ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              <img
                src={pendingDelete.url_miniatura || pendingDelete.url_web}
                alt={pendingDelete.nombre_original || 'Imagen'}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            </div>
          ) : null}
          {pendingDelete ? (
            <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-400 uppercase tracking-wide">Tipo</dt>
                <dd className="font-medium text-slate-800">{pendingDelete.tipo_mime}</dd>
              </div>
              <div>
                <dt className="text-slate-400 uppercase tracking-wide">Tamaño</dt>
                <dd className="font-medium text-slate-800">
                  {formatBytes(Number(pendingDelete.tamano_original_bytes))}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400 uppercase tracking-wide">Archivo</dt>
                <dd className="font-medium text-slate-800 truncate">
                  {pendingDelete.nombre_original}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </Dialog>
    </section>
  );
}

interface SortableImageCardProps {
  image: RoomImage;
  index: number;
  isActive: boolean;
  reordering: boolean;
  settingMain: boolean;
  deleting: boolean;
  onSetMain: () => void;
  onDelete: () => void;
}

function SortableImageCard({
  image,
  index,
  isActive,
  reordering,
  settingMain,
  deleting,
  onSetMain,
  onDelete,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white transition-all',
        image.es_principal
          ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-sm'
          : 'border-slate-200 hover:border-slate-300',
        isActive ? 'z-10 scale-[1.02] shadow-xl shadow-primary-500/10' : ''
      )}
    >
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        <img
          src={image.url_miniatura || image.url_web || image.url_original}
          alt={image.nombre_original || `Imagen ${index + 1}`}
          className="h-full w-full object-cover select-none"
          draggable={false}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
        {image.es_principal ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary-600 text-white px-2 py-0.5 text-[11px] font-semibold shadow-sm">
            <Star className="h-3 w-3 fill-white" aria-hidden="true" />
            Principal
          </span>
        ) : (
          <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-white/90 text-slate-600 ring-1 ring-slate-200 px-2 py-0.5 text-[10px] font-semibold shadow-sm">
            Orden {index + 1}
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />

        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={onSetMain}
            aria-label={image.es_principal ? 'Desmarcar imagen principal' : 'Marcar como imagen principal'}
            aria-pressed={image.es_principal}
            disabled={settingMain || image.es_principal}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all shadow-sm',
              image.es_principal
                ? 'bg-amber-400 text-amber-950 cursor-default'
                : 'bg-white/95 text-amber-600 hover:bg-amber-50 ring-1 ring-amber-200 disabled:opacity-60'
            )}
            title={image.es_principal ? 'Imagen principal' : 'Marcar como principal'}
          >
            <Star
              className={cn('h-4 w-4', image.es_principal ? 'fill-amber-950' : '')}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar imagen"
            disabled={deleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 hover:bg-rose-50 ring-1 ring-rose-200 disabled:opacity-60 transition-all shadow-sm"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="absolute left-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            aria-label="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
            disabled={reordering}
            className="inline-flex h-8 w-8 cursor-grab active:cursor-grabbing items-center justify-center rounded-full bg-white/95 text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200 disabled:opacity-60 transition-all shadow-sm"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-1 px-2.5 py-2">
        <p
          className="truncate text-xs font-medium text-slate-800"
          title={image.nombre_original}
        >
          {image.nombre_original || `Imagen ${index + 1}`}
        </p>
        <p className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
          <span>{formatBytes(Number(image.tamano_original_bytes))}</span>
          <span className="truncate text-slate-400">{image.tipo_mime}</span>
        </p>
      </div>
    </div>
  );
}

export default RoomImageGrid;
