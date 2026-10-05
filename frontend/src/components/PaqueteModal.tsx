'use client';

import * as React from 'react';
import {
  Check,
  Gift,
  Minus,
  Percent,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Input,
  Select,
  Textarea,
} from './ui';
import type { SelectOption } from './ui/Select';
import { formatCurrency } from '../lib/utils';
import { useServices } from '../hooks';
import type {
  CreatePaquetePayload,
  Paquete,
  ServicioAdicional,
  UpdatePaquetePayload,
} from '../types';

export interface PaqueteModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: Paquete | null;
  onSubmit: (
    payload: (CreatePaquetePayload | UpdatePaquetePayload) & { id?: string }
  ) => Promise<void>;
}

const estadoOptions: SelectOption[] = [
  { value: 'ACTIVO', label: 'Activo (Público en Web y Recepción)' },
  { value: 'INACTIVO', label: 'Inactivo (Oculto / Pausado)' },
];

interface SelectedServiceItem {
  servicioId: string;
  cantidad: number;
}

export function PaqueteModal({
  open,
  onClose,
  initialValue,
  onSubmit,
}: PaqueteModalProps) {
  const { data: availableServices = [], isLoading: servicesLoading } = useServices({ all: true });

  const [nombre, setNombre] = React.useState('');
  const [descripcion, setDescripcion] = React.useState('');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = React.useState<number | string>(0);
  const [estado, setEstado] = React.useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [selectedServices, setSelectedServices] = React.useState<Map<string, number>>(new Map());

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Inicializar estado del formulario
  React.useEffect(() => {
    if (open) {
      if (initialValue) {
        setNombre(initialValue.nombre);
        setDescripcion(initialValue.descripcion || '');
        setDescuentoPorcentaje(Number(initialValue.descuento_porcentaje) || 0);
        setEstado(initialValue.estado);

        const map = new Map<string, number>();
        if (initialValue.servicios && Array.isArray(initialValue.servicios)) {
          for (const s of initialValue.servicios) {
            const qty = s.PaqueteServicio?.cantidad || s.cantidad || 1;
            map.set(s.id, qty);
          }
        }
        setSelectedServices(map);
      } else {
        setNombre('');
        setDescripcion('');
        setDescuentoPorcentaje(10); // Sugerencia de promoción del 10%
        setEstado('ACTIVO');
        setSelectedServices(new Map());
      }
      setError(null);
    }
  }, [open, initialValue]);

  // Manejo de selección y cantidad de servicios
  function handleToggleService(servicioId: string) {
    setSelectedServices((prev) => {
      const next = new Map(prev);
      if (next.has(servicioId)) {
        next.delete(servicioId);
      } else {
        next.set(servicioId, 1);
      }
      return next;
    });
  }

  function handleUpdateQuantity(servicioId: string, delta: number) {
    setSelectedServices((prev) => {
      const next = new Map(prev);
      const current = next.get(servicioId) || 1;
      const updated = Math.max(1, current + delta);
      next.set(servicioId, updated);
      return next;
    });
  }

  // Mapa de servicios disponibles por ID para lookup rápido
  const servicesById = React.useMemo(() => {
    const map = new Map<string, ServicioAdicional>();
    for (const s of availableServices) {
      map.set(s.id, s);
    }
    return map;
  }, [availableServices]);

  // CÁLCULO EN VIVO DEL PATRÓN COMPOSITE
  const compositeCalculation = React.useMemo(() => {
    let subtotalBruto = 0;
    const items: Array<{
      servicio: ServicioAdicional;
      cantidad: number;
      subtotalItem: number;
    }> = [];

    selectedServices.forEach((cantidad, servicioId) => {
      const s = servicesById.get(servicioId);
      if (s) {
        const precioUnit = Number(s.precio) || 0;
        const subtotalItem = +(precioUnit * cantidad).toFixed(2);
        subtotalBruto += subtotalItem;
        items.push({
          servicio: s,
          cantidad,
          subtotalItem,
        });
      }
    });

    const descNum = Math.min(100, Math.max(0, Number(descuentoPorcentaje) || 0));
    const descuentoMonto = +(subtotalBruto * (descNum / 100)).toFixed(2);
    const totalNeto = Math.max(0, +(subtotalBruto - descuentoMonto).toFixed(2));

    return {
      items,
      subtotalBruto: +subtotalBruto.toFixed(2),
      descuentoPorcentaje: descNum,
      descuentoMonto,
      totalNeto,
    };
  }, [selectedServices, servicesById, descuentoPorcentaje]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre del paquete es obligatorio.');
      return;
    }

    const desc = Math.min(100, Math.max(0, Number(descuentoPorcentaje) || 0));

    // Convertir el mapa a array de payload
    const serviciosPayload: Array<{ servicio_id: string; cantidad: number }> = [];
    selectedServices.forEach((cantidad, servicio_id) => {
      serviciosPayload.push({
        servicio_id,
        cantidad,
      });
    });

    setSubmitting(true);
    try {
      await onSubmit({
        id: initialValue?.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        descuento_porcentaje: desc,
        estado,
        servicios: serviciosPayload,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al guardar el paquete turístico';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        initialValue ? 'Editar Paquete Turístico (Composite)' : 'Constructor de Paquete Promocional (Composite)'
      }
      description="Combina servicios atómicos (Leaf) en un combo promocional (Composite) y define un porcentaje de descuento que beneficie al huésped."
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="hidden sm:block text-left text-xs text-slate-500">
            <span>Precio Final Combo: </span>
            <strong className="text-sm font-bold text-emerald-700">
              {formatCurrency(compositeCalculation.totalNeto)} USD
            </strong>
            {compositeCalculation.descuentoMonto > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">
                (Ahorro huésped: -{formatCurrency(compositeCalculation.descuentoMonto)} USD)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-paquete"
              loading={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {initialValue ? 'Guardar Cambios' : 'Crear y Publicar Paquete'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="form-paquete" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Datos Básicos del Paquete */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nombre del Paquete Promocional *"
              placeholder="Ej: Plan Luna de Miel Romance, Combo Aventura Caribeña..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Estado de Publicación
            </label>
            <Select
              options={estadoOptions}
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'ACTIVO' | 'INACTIVO')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-2">
            <Textarea
              label="Descripción del Plan (Opcional)"
              placeholder="Describe la experiencia y los atractivos del paquete turístico..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Input
              label="Descuento Promocional (%)"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="0"
              value={descuentoPorcentaje}
              onChange={(e) => setDescuentoPorcentaje(e.target.value)}
              leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Descuento aplicado sobre la suma de los servicios añadidos.
            </p>
          </div>
        </div>

        {/* Sección: Constructor del Patrón Composite */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-600" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Composición de Servicios (Patrón Composite)
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {compositeCalculation.items.length} servicios seleccionados
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Columna Izquierda (3 cols): Catálogo de Servicios Disponibles para Añadir */}
            <div className="lg:col-span-3 space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Selecciona los servicios a incluir en el combo:
              </label>

              {servicesLoading ? (
                <div className="h-48 animate-pulse bg-slate-100 rounded-xl" />
              ) : availableServices.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                  <p className="text-xs text-slate-500">
                    No hay servicios registrados en el catálogo. Crea primero servicios atómicos en la pestaña de servicios.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {availableServices.map((servicio) => {
                    const isSelected = selectedServices.has(servicio.id);
                    const qty = selectedServices.get(servicio.id) || 1;

                    return (
                      <div
                        key={servicio.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-primary-50/50 border-primary-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          onClick={() => handleToggleService(servicio.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Manejado por onClick contenedor
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {servicio.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatCurrency(Number(servicio.precio))} USD unitario
                              {servicio.estado === 'INACTIVO' && (
                                <span className="ml-1 text-amber-600 font-medium">(Pausado)</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(servicio.id, -1)}
                              className="h-6 w-6 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs"
                              title="Restar cantidad"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 w-5 text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(servicio.id, 1)}
                              className="h-6 w-6 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs"
                              title="Sumar cantidad"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Columna Derecha (2 cols): Visualizador en Tiempo Real del Patrón Composite */}
            <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-white p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-emerald-600" />
                  Desglose Composite
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
                  {compositeCalculation.items.length} Hojas (Leaf)
                </Badge>
              </div>

              {compositeCalculation.items.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Selecciona uno o más servicios a la izquierda para armar la cotización del combo.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-xs">
                    {compositeCalculation.items.map(({ servicio, cantidad, subtotalItem }) => (
                      <div
                        key={servicio.id}
                        className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50"
                      >
                        <span className="truncate text-slate-700">
                          {cantidad > 1 ? `${cantidad}x ` : ''}
                          {servicio.nombre}
                        </span>
                        <span className="font-semibold text-slate-900 shrink-0 ml-2">
                          {formatCurrency(subtotalItem)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal Bruto:</span>
                      <span>{formatCurrency(compositeCalculation.subtotalBruto)} USD</span>
                    </div>

                    {compositeCalculation.descuentoPorcentaje > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Descuento (-{compositeCalculation.descuentoPorcentaje}%):</span>
                        <span>-{formatCurrency(compositeCalculation.descuentoMonto)} USD</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-dashed border-slate-200">
                      <span>Total Promocional:</span>
                      <span className="text-emerald-700">
                        {formatCurrency(compositeCalculation.totalNeto)} USD
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export default PaqueteModal;
