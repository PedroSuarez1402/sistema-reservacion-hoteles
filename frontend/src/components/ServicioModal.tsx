'use client';

import * as React from 'react';
import { Button, Dialog, Input, Select, Textarea } from './ui';
import type { SelectOption } from './ui/Select';
import type {
  CreateServicioPayload,
  ServicioAdicional,
  UpdateServicioPayload,
} from '../types';

export interface ServicioModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: ServicioAdicional | null;
  onSubmit: (
    payload: (CreateServicioPayload | UpdateServicioPayload) & { id?: string }
  ) => Promise<void>;
}

const estadoOptions: SelectOption[] = [
  { value: 'ACTIVO', label: 'Activo (Disponible)' },
  { value: 'INACTIVO', label: 'Inactivo (Pausado)' },
];

export function ServicioModal({
  open,
  onClose,
  initialValue,
  onSubmit,
}: ServicioModalProps) {
  const [nombre, setNombre] = React.useState('');
  const [precio, setPrecio] = React.useState<number | string>('');
  const [descripcion, setDescripcion] = React.useState('');
  const [estado, setEstado] = React.useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (initialValue) {
        setNombre(initialValue.nombre);
        setPrecio(Number(initialValue.precio));
        setDescripcion(initialValue.descripcion || '');
        setEstado(initialValue.estado);
      } else {
        setNombre('');
        setPrecio('');
        setDescripcion('');
        setEstado('ACTIVO');
      }
      setError(null);
    }
  }, [open, initialValue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre del servicio es obligatorio.');
      return;
    }

    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError('El precio debe ser un número mayor o igual a 0.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        id: initialValue?.id,
        nombre: nombre.trim(),
        precio: precioNum,
        descripcion: descripcion.trim() || undefined,
        estado,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al guardar el servicio';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initialValue ? 'Editar Servicio Adicional' : 'Nuevo Servicio Adicional'}
      description="Los servicios adicionales son las hojas básicas (Leaf) del Patrón Composite que componen los paquetes turísticos."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-servicio"
            loading={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {initialValue ? 'Guardar Cambios' : 'Crear Servicio'}
          </Button>
        </div>
      }
    >
      <form id="form-servicio" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Nombre del Servicio *"
          placeholder="Ej: Desayuno Buffet Americano, Tour en Lancha, Masaje Spa..."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Precio Unitario (USD) *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Estado de Disponibilidad
            </label>
            <Select
              options={estadoOptions}
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'ACTIVO' | 'INACTIVO')}
            />
          </div>
        </div>

        <Textarea
          label="Descripción (Opcional)"
          placeholder="Detalles sobre lo que incluye el servicio, duración o especificaciones..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
        />
      </form>
    </Dialog>
  );
}

export default ServicioModal;
