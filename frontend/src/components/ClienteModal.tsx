'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Input, Select, useToast } from './ui';
import type { SelectOption } from './ui/Select';
import type { ClientListItem, UpdateUserPayload, UserRole } from '../types';

const userFormSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  email: z
    .string()
    .email('Ingresa un correo electrónico válido')
    .max(150, 'El email no puede exceder 150 caracteres')
    .trim(),
  rol: z.enum(['HUESPED', 'ADMIN', 'RECEPCION']).optional(),
});

export type ClienteFormValues = z.infer<typeof userFormSchema>;

const rolOptions: SelectOption[] = [
  { value: 'HUESPED', label: 'Huésped' },
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'ADMIN', label: 'Administrador' },
];

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: ClientListItem | null;
  canEditRole?: boolean;
  onSubmit: (payload: UpdateUserPayload & { id: string }) => Promise<void> | void;
  isLoading?: boolean;
}

function ClienteModal({
  open,
  onClose,
  initialValue,
  canEditRole = false,
  onSubmit,
  isLoading,
}: ClienteModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      nombre: '',
      email: '',
      rol: 'HUESPED',
    },
    mode: 'onTouched',
  });

  const currentRol = watch('rol');

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setValue('nombre', initialValue.nombre);
      setValue('email', initialValue.email);
      setValue('rol', initialValue.rol);
    } else {
      reset({
        nombre: '',
        email: '',
        rol: 'HUESPED',
      });
    }
  }, [open, initialValue, setValue, reset]);

  async function handleValidSubmit(values: ClienteFormValues) {
    if (!initialValue) return;
    try {
      const payload: UpdateUserPayload & { id: string } = {
        id: initialValue.id,
        nombre: values.nombre.trim(),
        email: values.email.trim(),
      };
      if (canEditRole && values.rol) {
        payload.rol = values.rol as UserRole;
      }
      await onSubmit(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el cliente';
      toast.error('Error al guardar', message);
    }
  }

  const soloLecturaRol = !canEditRole;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editar datos del cliente"
      description={
        canEditRole
          ? 'Actualiza los datos de contacto y el rol de acceso del usuario.'
          : 'Actualiza los datos de contacto del huésped. Para cambiar roles contacta a un administrador.'
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(handleValidSubmit, (err) => console.debug('invalid user', err))}
            loading={isLoading}
          >
            Guardar cambios
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
          label="Nombre completo"
          placeholder="Ej. María González Pérez"
          error={errors.nombre?.message}
          autoFocus
          {...register('nombre')}
        />
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="maria@ejemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="space-y-1.5">
          <Select
            label="Rol de acceso"
            options={rolOptions}
            value={currentRol ?? 'HUESPED'}
            onChange={(e) => setValue('rol', e.target.value as UserRole, { shouldValidate: true })}
            disabled={soloLecturaRol}
            hint={
              soloLecturaRol
                ? 'Solo los administradores pueden cambiar el rol.'
                : 'Define el nivel de permisos de este usuario en el sistema.'
            }
            error={errors.rol?.message}
          />
        </div>
      </form>
    </Dialog>
  );
}

export { ClienteModal };
