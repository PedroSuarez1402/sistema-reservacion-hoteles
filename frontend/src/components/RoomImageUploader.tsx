'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  X as XIcon,
  Image as ImageIcon,
  FileWarning,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui';
import { useToast } from './ui/Toast';
import { cn, clientValidateImageFile, formatBytes, IMAGE_MAX_BYTES } from '../lib/utils';
import {
  useUploadRoomImages,
  useRoom,
} from '../hooks';
import type { RoomImage } from '../types';

interface PendingFile {
  key: string;
  file: File;
  preview: string;
  error: string | null;
  percent: number;
  uploading: boolean;
  uploaded: boolean;
}

function createPending(file: File): PendingFile {
  const validation = clientValidateImageFile(file);
  return {
    key:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    preview: '',
    error: validation.ok ? null : validation.message,
    percent: 0,
    uploading: false,
    uploaded: false,
  };
}

interface RoomImageUploaderProps {
  roomId: string;
  className?: string;
  onUploaded?: (images: RoomImage[]) => void;
}

export function RoomImageUploader({ roomId, className, onUploaded }: RoomImageUploaderProps) {
  const { success, error: toastError, info } = useToast();
  const [pendings, setPendings] = React.useState<PendingFile[]>([]);
  const pendingsRef = useRef<PendingFile[]>([]);
  pendingsRef.current = pendings;

  const uploadMutation = useUploadRoomImages({
    onError(err) {
      toastError('No se pudieron subir las imágenes', (err as any)?.message || undefined);
    },
  });

  const { refetch } = useRoom(roomId, { enabled: false });

  const accept = useMemo(
    () => ({
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    }),
    []
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const entries = acceptedFiles.map(createPending);
    setPendings((prev) => [...prev, ...entries]);
    if (acceptedFiles.length > 0) {
      info(`Se agregaron ${acceptedFiles.length} archivo(s) para subir`);
    }
  }, [info]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles: 20,
    maxSize: IMAGE_MAX_BYTES,
    multiple: true,
    useFsAccessApi: false,
  });

  useEffect(() => {
    if (fileRejections && fileRejections.length > 0) {
      const messages = fileRejections.map((r) => {
        const first = r.errors[0];
        if (!first) return r.file.name;
        if (first.code === 'file-too-large') return `${r.file.name}: supera 10MB`;
        if (first.code === 'file-invalid-type')
          return `${r.file.name}: tipo no permitido (solo JPG, PNG, WebP)`;
        return `${r.file.name}: ${first.message}`;
      });
      setPendings((prev) => [
        ...prev,
        ...fileRejections.map((r) => ({
          ...createPending(r.file),
          error: messages[fileRejections.indexOf(r)] ?? 'Archivo rechazado',
        })),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileRejections]);

  useEffect(() => {
    const urls = pendings.map((p) => p.preview).filter(Boolean);
    const settable = pendings
      .filter((p) => !p.preview && !p.error && typeof URL !== 'undefined')
      .map((p) => ({ key: p.key, url: URL.createObjectURL(p.file) }));
    if (settable.length > 0) {
      setPendings((prev) =>
        prev.map((p) => {
          const match = settable.find((s) => s.key === p.key);
          return match ? { ...p, preview: match.url } : p;
        })
      );
    }
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      settable.forEach((s) => URL.revokeObjectURL(s.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendings.length]);

  function removePending(key: string) {
    setPendings((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.key !== key);
    });
  }

  const canUpload = pendings.some((p) => !p.uploaded && !p.error && !p.uploading);
  const totalInvalid = pendings.filter((p) => p.error).length;

  async function handleUpload() {
    const toUpload = pendingsRef.current.filter(
      (p) => !p.uploaded && !p.error && !p.uploading
    );
    if (toUpload.length === 0) return;
    setPendings((prev) =>
      prev.map((p) => (toUpload.some((t) => t.key === p.key) ? { ...p, uploading: true, percent: 0 } : p))
    );
    try {
      const files: File[] = toUpload.map((p) => p.file);
      const keysByFile = new Map(
        toUpload.map((p, idx) => [files[idx], p.key] as const)
      );
      const uploaded = await uploadMutation.mutateAsync({
        roomId,
        files,
        onProgress(file, percent) {
          const key = keysByFile.get(file);
          if (!key) return;
          setPendings((prev) =>
            prev.map((p) => (p.key === key ? { ...p, percent } : p))
          );
        },
      });
      setPendings((prev) =>
        prev.map((p) =>
          toUpload.some((t) => t.key === p.key) ? { ...p, uploaded: true, uploading: false, percent: 100 } : p
        )
      );
      success(
        `${uploaded.length} imagen(es) subida(s) correctamente`,
        'Ya puedes cambiar el orden y marcar la principal'
      );
      void refetch();
      if (typeof onUploaded === 'function') onUploaded(uploaded);
      window.setTimeout(() => {
        setPendings((prev) => prev.filter((p) => !p.uploaded));
      }, 1200);
    } catch (err) {
      const msg = (err as any)?.message || 'Error desconocido';
      setPendings((prev) =>
        prev.map((p) =>
          toUpload.some((t) => t.key === p.key)
            ? { ...p, uploading: false, error: msg }
            : p
        )
      );
    }
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Subida de imágenes">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-primary-600" aria-hidden="true" />
            Subir nuevas imágenes
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Máximo 20 imágenes · JPG, PNG o WebP · hasta 10MB cada una · Arrastra y suelta
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalInvalid > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-xs font-medium">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {totalInvalid} inválido(s)
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={!canUpload || uploadMutation.isPending}
            loading={uploadMutation.isPending}
            leftIcon={<UploadCloud className="h-4 w-4" />}
          >
            Subir {pendings.filter((p) => !p.uploaded && !p.error).length || ''} imágenes
          </Button>
        </div>
      </header>

      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
          isDragActive
            ? 'border-primary-500 bg-primary-50/70'
            : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
        )}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de imágenes. Haz click o arrastra archivos aquí."
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-7 text-center">
          <div
            className={cn(
              'inline-flex h-12 w-12 items-center justify-center rounded-full',
              isDragActive ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
            )}
            aria-hidden="true"
          >
            {isDragActive ? (
              <UploadCloud className="h-6 w-6 animate-bounce" />
            ) : (
              <ImageIcon className="h-6 w-6" />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-800">
              {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí'}
            </p>
            <p className="text-xs text-slate-500">
              o haz <span className="text-primary-600 font-medium">click para seleccionar</span>{' '}
              archivos
            </p>
          </div>
        </div>
      </div>

      {pendings.length > 0 ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          aria-live="polite"
        >
          {pendings.map((p) => (
            <PendingCard key={p.key} pending={p} onRemove={() => removePending(p.key)} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PendingCard({
  pending,
  onRemove,
}: {
  pending: PendingFile;
  onRemove: () => void;
}) {
  const hasError = !!pending.error;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white transition-all',
        hasError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        {pending.preview && !hasError ? (
          <img
            src={pending.preview}
            alt={`Previsualización de ${pending.file.name}`}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              hasError ? 'text-rose-500' : 'text-slate-400'
            )}
            aria-hidden="true"
          >
            {hasError ? (
              <FileWarning className="h-8 w-8" />
            ) : (
              <ImageIcon className="h-8 w-8" />
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar archivo ${pending.file.name}`}
          className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/80"
        >
          <XIcon className="h-4 w-4" />
        </button>
        {pending.uploading || pending.percent > 0 ? (
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div
              className={cn(
                'h-1.5 w-full overflow-hidden rounded-full',
                hasError ? 'bg-rose-200' : 'bg-black/20'
              )}
              role="progressbar"
              aria-valuenow={pending.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de subida"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-200',
                  hasError ? 'bg-rose-500' : 'bg-primary-500'
                )}
                style={{ width: `${Math.max(4, pending.percent)}%` }}
              />
            </div>
          </div>
        ) : null}
        {pending.uploaded ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 text-white px-2 py-0.5 text-[10px] font-semibold shadow-sm">
            ✓ Subida
          </span>
        ) : null}
      </div>
      <div className="space-y-1 px-2.5 py-2">
        <p
          className="truncate text-xs font-medium text-slate-800"
          title={pending.file.name}
        >
          {pending.file.name || 'Sin nombre'}
        </p>
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>{formatBytes(pending.file.size)}</span>
          {pending.uploading || pending.percent > 0 ? (
            <span className="font-semibold text-primary-600">{pending.percent}%</span>
          ) : null}
        </div>
        {hasError ? (
          <p className="text-[11px] font-medium text-rose-600 flex items-start gap-1 leading-tight">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            {pending.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default RoomImageUploader;
