/**
 * Hoja de Hospedaje (Leaf - Patrón Composite)
 * 
 * Representa el costo de la estancia de una habitación según el número de noches.
 * No tiene componentes hijos.
 */

import { ComponenteCotizacion } from './ComponenteCotizacion.js';

export class HospedajeItem extends ComponenteCotizacion {
  #habitacionId;
  #numeroHabitacion;
  #noches;
  #precioNoche;

  constructor({ habitacionId, numeroHabitacion = '', noches, precioNoche }) {
    super();
    if (!habitacionId) {
      throw new Error('[HospedajeItem] habitacionId es obligatorio.');
    }
    const n = Math.max(1, Number(noches) || 1);
    const p = Math.max(0, Number(precioNoche) || 0);

    this.#habitacionId = String(habitacionId).trim();
    this.#numeroHabitacion = String(numeroHabitacion || '').trim();
    this.#noches = n;
    this.#precioNoche = p;
  }

  get habitacionId() {
    return this.#habitacionId;
  }

  get noches() {
    return this.#noches;
  }

  get precioNoche() {
    return this.#precioNoche;
  }

  obtenerNombre() {
    return this.#numeroHabitacion
      ? `Estancia Habitación ${this.#numeroHabitacion}`
      : 'Estancia de Hospedaje';
  }

  /**
   * Calcula: noches * precioNoche
   */
  calcularPrecio() {
    return +(this.#noches * this.#precioNoche).toFixed(2);
  }

  obtenerDesglose() {
    const subtotal = this.calcularPrecio();
    return {
      tipo: 'HOSPEDAJE',
      nombre: this.obtenerNombre(),
      habitacion_id: this.#habitacionId,
      numero_habitacion: this.#numeroHabitacion || undefined,
      noches: this.#noches,
      precio_noche: +this.#precioNoche.toFixed(2),
      subtotal: +subtotal.toFixed(2),
    };
  }
}

export default HospedajeItem;
