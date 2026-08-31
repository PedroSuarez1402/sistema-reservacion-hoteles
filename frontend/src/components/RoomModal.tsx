'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Input, Select } from './ui';
import type { SelectOption } from './ui/Select';
import type { CreateRoomPayload, Room, UpdateRoomPayload } from '../types';

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
    } else {
      reset({
        numero: '',
        tipo: 'SENCILLA',
        precio_noche: undefined as unknown as number,
        estado: 'ACTIVA',
      });
    }
  }, [open, initialValue, setValue, reset]);

  const modo = initialValue ? 'edit' : 'create';

  async function handleValidSubmit(values: RoomFormValues) {
    const payload: CreateRoomPayload & { id?: string } = {
      numero: values.numero.trim(),
      tipo: values.tipo,
      precio_noche: Number(values.precio_noche),
    };
    if (allowStatusEdit && initialValue) {
      (payload as UpdateRoomPayload).estado = values.estado;
    }
    if (initialValue) payload.id = initialValue.id;
    await onSubmit(payload);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={modo === 'create' ? 'Agregar habitación' : 'Editar habitación'}
      description={
        modo === 'create'
          ? 'Ingresa los datos para registrar una nueva habitación en el inventario.'
          : 'Actualiza los datos de la habitación seleccionada.'
      }
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
      </form>
    </Dialog>
  );
}

export { RoomModal };
