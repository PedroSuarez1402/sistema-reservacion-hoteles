'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, User, Users, ShieldAlert, FileText, Phone, Mail, Home } from 'lucide-react';
import { Button, Dialog, Input, useToast } from './ui';
import type { Cliente, Acompanante } from '../types';

const acompananteSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
  documento: z.string().optional(),
  parentesco: z.string().optional(),
  telefono: z.string().optional(),
});

const clienteFormSchema = z.object({
  documento: z
    .string()
    .min(3, 'El documento debe tener al menos 3 caracteres')
    .max(50, 'El documento no puede exceder 50 caracteres')
    .trim(),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede exceder 120 caracteres')
    .trim(),
  email: z
    .string()
    .email('Ingresa un correo electrónico válido')
    .max(150, 'El email no puede exceder 150 caracteres')
    .trim(),
  telefono: z.string().max(30).optional().or(z.literal('')),
  direccion: z.string().max(255).optional().or(z.literal('')),
  observaciones: z.string().max(500).optional().or(z.literal('')),
  acompanantes: z.array(acompananteSchema).optional(),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;

export interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: Cliente | null;
  onSubmit: (payload: {
    id?: string;
    documento: string;
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
    observaciones?: string;
    acompanantes?: Array<{
      id?: string;
      nombre: string;
      documento?: string;
      parentesco?: string;
      telefono?: string;
    }>;
  }) => Promise<void> | void;
  isLoading?: boolean;
}

function ClienteModal({
  open,
  onClose,
  initialValue,
  onSubmit,
  isLoading,
}: ClienteModalProps) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      documento: '',
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      observaciones: '',
      acompanantes: [],
    },
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'acompanantes',
  });

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      reset({
        documento: initialValue.documento || '',
        nombre: initialValue.nombre || '',
        email: initialValue.email || '',
        telefono: initialValue.telefono || '',
        direccion: initialValue.direccion || '',
        observaciones: initialValue.observaciones || '',
        acompanantes: (initialValue.acompanantes || []).map((a) => ({
          id: a.id,
          nombre: a.nombre,
          documento: a.documento || '',
          parentesco: a.parentesco || '',
          telefono: a.telefono || '',
        })),
      });
    } else {
      reset({
        documento: '',
        nombre: '',
        email: '',
        telefono: '',
        direccion: '',
        observaciones: '',
        acompanantes: [],
      });
    }
  }, [open, initialValue, reset]);

  async function handleValidSubmit(values: ClienteFormValues) {
    try {
      await onSubmit({
        id: initialValue?.id,
        documento: values.documento.trim(),
        nombre: values.nombre.trim(),
        email: values.email.trim(),
        telefono: values.telefono?.trim() || undefined,
        direccion: values.direccion?.trim() || undefined,
        observaciones: values.observaciones?.trim() || undefined,
        acompanantes: values.acompanantes?.map((a) => ({
          id: a.id,
          nombre: a.nombre.trim(),
          documento: a.documento?.trim() || undefined,
          parentesco: a.parentesco?.trim() || undefined,
          telefono: a.telefono?.trim() || undefined,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el cliente';
      toast.error('Error al guardar cliente', message);
    }
  }

  const isEditing = Boolean(initialValue?.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
      description="Gestiona la información personal del cliente huésped y sus acompañantes frecuentes."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(handleValidSubmit)}
            loading={isLoading}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(handleValidSubmit)(e);
        }}
        className="space-y-6"
      >
        {/* Datos Principales */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <User className="h-4 w-4 text-primary-600" />
            <span>Información del Cliente Titular</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Documento de Identidad *"
              placeholder="Cédula, DNI o Pasaporte"
              error={errors.documento?.message}
              {...register('documento')}
            />

            <Input
              label="Nombre Completo *"
              placeholder="Ej. Carlos Mendoza"
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Input
              label="Correo Electrónico *"
              type="email"
              placeholder="cliente@ejemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Teléfono / WhatsApp"
              placeholder="+57 300 123 4567"
              error={errors.telefono?.message}
              {...register('telefono')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Dirección de Residencia"
              placeholder="Ciudad, País o Dirección"
              error={errors.direccion?.message}
              {...register('direccion')}
            />

            <Input
              label="Observaciones o Preferencias"
              placeholder="Alergias, piso preferido, etc."
              error={errors.observaciones?.message}
              {...register('observaciones')}
            />
          </div>
        </div>

        {/* Acompañantes Vinculados */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-slate-800">
                Acompañantes Habituales ({fields.length})
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ nombre: '', documento: '', parentesco: '', telefono: '' })}
              className="gap-1.5 text-xs text-primary-700 border-primary-200 hover:bg-primary-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar Acompañante
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No tiene acompañantes registrados previamente. Puedes agregarlos aquí o durante la reservación.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="relative rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2.5 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Acompañante #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                      title="Eliminar fila"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <Input
                      label="Nombre *"
                      placeholder="Nombre y apellido"
                      error={errors.acompanantes?.[idx]?.nombre?.message}
                      {...register(`acompanantes.${idx}.nombre` as const)}
                    />
                    <Input
                      label="Documento"
                      placeholder="Doc / ID"
                      {...register(`acompanantes.${idx}.documento` as const)}
                    />
                    <Input
                      label="Parentesco"
                      placeholder="Esposo/a, Hijo/a, etc."
                      {...register(`acompanantes.${idx}.parentesco` as const)}
                    />
                    <Input
                      label="Teléfono"
                      placeholder="Opcional"
                      {...register(`acompanantes.${idx}.telefono` as const)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}

export { ClienteModal };
export default ClienteModal;
