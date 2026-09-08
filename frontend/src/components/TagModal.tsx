'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Input, Textarea, useToast } from './ui';
import type { CreateTagPayload, Tag, UpdateTagPayload } from '../types';

const tagSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  descripcion: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .trim()
    .nullable()
    .optional(),
});

export type TagFormValues = z.infer<typeof tagSchema>;

interface TagModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: Tag | null;
  onSubmit: (
    payload: (CreateTagPayload & { id?: string }) | UpdateTagPayload & { id?: string }
  ) => Promise<void> | void;
  isLoading?: boolean;
}

function TagModal({ open, onClose, initialValue, onSubmit, isLoading }: TagModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setValue('nombre', initialValue.nombre);
      setValue('descripcion', initialValue.descripcion ?? '');
    } else {
      reset({
        nombre: '',
        descripcion: '',
      });
    }
  }, [open, initialValue, setValue, reset]);

  const modo = initialValue ? 'edit' : 'create';

  async function handleValidSubmit(values: TagFormValues) {
    try {
      const payload: CreateTagPayload & { id?: string } = {
        nombre: values.nombre.trim(),
      };
      if (values.descripcion && values.descripcion.trim().length > 0) {
        payload.descripcion = values.descripcion.trim();
      }
      if (initialValue) payload.id = initialValue.id;
      await onSubmit(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la etiqueta';
      toast.error('Error al guardar', message);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={modo === 'create' ? 'Nueva etiqueta' : 'Editar etiqueta'}
      description={
        modo === 'create'
          ? 'Crea una nueva etiqueta para describir características de las habitaciones.'
          : 'Actualiza el nombre y la descripción administrativa de la etiqueta.'
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(handleValidSubmit, (err) => console.debug('invalid tag', err))}
            loading={isLoading}
          >
            {modo === 'create' ? 'Crear etiqueta' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(handleValidSubmit)(e);
        }}
        className="space-y-4"
      >
        <Input
          label="Nombre de la etiqueta"
          placeholder="Ej. Cama Queen Size, Wi‑Fi 100 Mbps..."
          error={errors.nombre?.message}
          autoFocus
          {...register('nombre')}
        />
        <Textarea
          label="Descripción administrativa (opcional)"
          placeholder="Notas internas sobre el uso de esta etiqueta (no visible para huéspedes)."
          rows={3}
          error={errors.descripcion?.message}
          {...register('descripcion')}
        />
      </form>
    </Dialog>
  );
}

export { TagModal };
