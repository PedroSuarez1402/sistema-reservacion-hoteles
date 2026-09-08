'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Input, Select, Textarea } from './ui';
import { Badge } from './ui/Badge';
import type { SelectOption } from './ui/Select';
import type { CreateRoomPayload, Room, RoomImage, UpdateRoomPayload } from '../types';
import { RoomImageUploader } from './RoomImageUploader';
import { RoomImageGrid } from './RoomImageGrid';
import { TagSelector } from './TagSelector';
import { cn } from '../lib/utils';
import { Lightbulb } from 'lucide-react';

const roomTypeOptions: SelectOption[] = [
  { value: 'SENCILLA', label: 'Sencilla' },
  { value: 'DOBLE', label: 'Doble' },
  { value: 'SUITE', label: 'Suite' },
];

const roomStatusOptions: SelectOption[] = [
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'ELIMINADA', label: 'Eliminada' },
];

const createRoomSchema = z.object({
  numero: z.string().min(1, 'El número es requerido').max(10),
  tipo: z.enum(['SENCILLA', 'DOBLE', 'SUITE'], {
    required_error: 'Selecciona un tipo de habitación',
  }),
  precio_noche: z.coerce
    .number({ required_error: 'Precio por noche es requerido' })
    .positive('El precio debe ser mayor a 0'),
  estado: z.enum(['ACTIVA', 'MANTENIMIENTO', 'ELIMINADA'], {
    required_error: 'Selecciona un estado',
  }),
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(2000, 'La descripción no puede exceder 2000 caracteres')
    .trim(),
  tag_ids: z
    .array(z.string().uuid('Identificador de etiqueta inválido'))
    .max(20, 'Máximo 20 etiquetas por habitación')
    .optional(),
});

export type RoomFormValues = z.infer<typeof createRoomSchema>;

interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: Room | null;
  onSubmit: (payload: CreateRoomPayload & { id?: string }) => Promise<void> | void;
  isLoading?: boolean;
  allowStatusEdit?: boolean;
}

function RoomModal({
  open,
  onClose,
  initialValue,
  onSubmit,
  isLoading,
  allowStatusEdit = false,
}: RoomModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    watch,
  } = useForm<RoomFormValues>({
      resolver: zodResolver(createRoomSchema),
      defaultValues: {
        numero: '',
        tipo: 'SENCILLA',
        precio_noche: undefined as unknown as number,
        estado: 'ACTIVA',
        descripcion: '',
        tag_ids: [],
      },
      mode: 'onTouched',
    });

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setValue('numero', initialValue.numero);
      setValue('tipo', initialValue.tipo);
      setValue('precio_noche', Number(initialValue.precio_noche));
      setValue('estado', initialValue.estado);
      setValue('descripcion', initialValue.descripcion ?? '');
      const tags = initialValue.etiquetas ?? [];
      setValue(
        'tag_ids',
        tags.map((t) => t.id)
      );
    } else {
      reset({
        numero: '',
        tipo: 'SENCILLA',
        precio_noche: undefined as unknown as number,
        estado: 'ACTIVA',
        descripcion: '',
        tag_ids: [],
      });
    }
  }, [open, initialValue, setValue, reset]);

  const modo = initialValue ? 'edit' : 'create';
  const dialogSize: 'md' | 'lg' | 'xl' = initialValue ? 'lg' : 'lg';
  const images: RoomImage[] | undefined = initialValue?.imagenes as RoomImage[] | undefined;

  async function handleValidSubmit(values: RoomFormValues) {
    const payload: CreateRoomPayload & { id?: string } = {
      numero: values.numero.trim(),
      tipo: values.tipo,
      precio_noche: Number(values.precio_noche),
      descripcion: values.descripcion.trim(),
      tag_ids: values.tag_ids ?? [],
    };
    if (allowStatusEdit && initialValue) {
      (payload as UpdateRoomPayload).estado = values.estado;
    }
    if (initialValue) payload.id = initialValue.id;
    await onSubmit(payload);
  }

  const watchTagIds = watch('tag_ids') ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={modo === 'create' ? 'Agregar habitación' : 'Editar habitación'}
      description={
        modo === 'create'
          ? 'Ingresa los datos para registrar una nueva habitación en el inventario.'
          : 'Actualiza los datos, la galería de imágenes y las etiquetas de la habitación seleccionada.'
      }
      size={dialogSize}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(handleValidSubmit, (err) => console.debug('invalid', err))}
            loading={isLoading}
          >
            {modo === 'create' ? 'Crear habitación' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(handleValidSubmit)(e);
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Input
            label="Número"
            placeholder="Ej. 101"
            error={errors.numero?.message}
            {...register('numero')}
          />
          <Select
            label="Tipo"
            placeholder="Selecciona un tipo"
            options={roomTypeOptions}
            value={watch('tipo')}
            onChange={(e) => setValue('tipo', e.target.value as RoomFormValues['tipo'], { shouldValidate: true })}
            error={errors.tipo?.message}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Precio por noche"
            placeholder="Ej. 1500"
            error={errors.precio_noche?.message}
            {...register('precio_noche')}
          />
          {allowStatusEdit ? (
            <Select
              label="Estado"
              options={roomStatusOptions}
              value={watch('estado')}
              onChange={(e) => setValue('estado', e.target.value as RoomFormValues['estado'])}
              error={errors.estado?.message}
            />
          ) : null}

          <div className="sm:col-span-2">
            <Textarea
              label="Descripción detallada"
              placeholder="Describe comodidades, ambiente y detalles específicos de esta habitación (ej. vista al jardín, piso alto, acceso a terraza...)."
              rows={4}
              error={errors.descripcion?.message}
              {...register('descripcion')}
            />
          </div>

          <div className="sm:col-span-2">
            <TagSelector
              label="Etiquetas y características"
              value={watchTagIds}
              onChange={(next) => setValue('tag_ids', next, { shouldValidate: true })}
              error={errors.tag_ids?.message as string | undefined}
              hint="Selecciona las características que describen esta habitación. Crea nuevas etiquetas si falta alguna."
            />
          </div>
        </form>

        <div
          className={cn(
            'rounded-xl border p-4',
            modo === 'edit'
              ? 'border-slate-200 bg-slate-50/50'
              : 'border-amber-200 bg-amber-50/60'
          )}
          aria-label="Gestión de imágenes"
        >
          {modo === 'edit' && initialValue?.id ? (
            <div className="space-y-5">
              <RoomImageGrid
                roomId={initialValue.id}
                images={images}
              />
              <div className="border-t border-dashed border-slate-200" />
              <RoomImageUploader roomId={initialValue.id} />
            </div>
          ) : (
            <div className="flex items-start gap-3 text-amber-800">
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200 flex-shrink-0"
                aria-hidden="true"
              >
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  Primero crea la habitación para gestionar sus imágenes
                </p>
                <p className="text-xs text-amber-700/90">
                  La relación con la habitación es requerida para asociar archivos. Una vez guardada,{' '}
                  <Badge className="align-middle" variant="outline">edítala</Badge> para abrir la sección de imágenes y sube fotografías, reordénalas, marca la principal y elimina las que no necesites.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

export { RoomModal };
