/**
 * Hoja de Servicio Simple / Individual (Leaf - Patrón Composite)
 * 
 * Representa un servicio adicional unitario (ej. Cena Gourmet, Circuito Spa, Desayuno).
 * Es un elemento terminal que calcula su costo multiplicando precio unitario por cantidad.
 */

import { ComponenteCotizacion } from './ComponenteCotizacion.js';

export class ServicioSimple extends ComponenteCotizacion {
  #servicioId;
  #nombre;
  #precioUnitario;
  #cantidad;
  #descripcion;

  constructor({ servicioId = null, nombre, precioUnitario, cantidad = 1, descripcion = '' }) {
    super();
    if (!nombre || typeof nombre !== 'string') {
      throw new Error('[ServicioSimple] El nombre del servicio es obligatorio.');
    }
    const precio = Number(precioUnitario);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error(`[ServicioSimple] Precio unitario inválido para '${nombre}'.`);
    }
    const cant = Math.max(1, Number(cantidad) || 1);

    this.#servicioId = servicioId ? String(servicioId).trim() : null;
    this.#nombre = String(nombre).trim();
    this.#precioUnitario = precio;
    this.#cantidad = cant;
    this.#descripcion = String(descripcion || '').trim();
  }

  get servicioId() {
    return this.#servicioId;
  }

  get nombre() {
    return this.#nombre;
  }

  get precioUnitario() {
    return this.#precioUnitario;
  }

  get cantidad() {
    return this.#cantidad;
  }

  obtenerNombre() {
    return this.#cantidad > 1
      ? `${this.#cantidad}x ${this.#nombre}`
      : this.#nombre;
  }

  /**
   * Calcula: precioUnitario * cantidad
   */
  calcularPrecio() {
    return +(this.#precioUnitario * this.#cantidad).toFixed(2);
  }

  obtenerDesglose() {
    const subtotal = this.calcularPrecio();
    return {
      tipo: 'SERVICIO_INDIVIDUAL',
      servicio_id: this.#servicioId,
      nombre: this.#nombre,
      precio_unitario: +this.#precioUnitario.toFixed(2),
      cantidad: this.#cantidad,
      descripcion: this.#descripcion || undefined,
      subtotal: +subtotal.toFixed(2),
    };
  }
}

export default ServicioSimple;
