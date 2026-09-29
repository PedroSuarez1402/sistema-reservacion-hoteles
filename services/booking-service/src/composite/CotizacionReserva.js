/**
 * Contenedor Raíz de Cotización (Composite Root - Patrón Composite)
 * 
 * Agrupa todos los elementos facturables de una reserva (Hospedaje, Paquetes y Servicios adicionales).
 * Permite calcular el total global de la reservación tratando de forma transparente hojas y compuestos.
 */

import { ComponenteCotizacion } from './ComponenteCotizacion.js';

export class CotizacionReserva extends ComponenteCotizacion {
  #items = [];
  #impuestoPorcentaje;

  constructor({ impuestoPorcentaje = 0 } = {}) {
    super();
    this.#impuestoPorcentaje = Math.max(0, Number(impuestoPorcentaje) || 0);
    this.#items = [];
  }

  esCompuesto() {
    return true;
  }

  obtenerNombre() {
    return 'Cotización de Reservación';
  }

  /**
   * Agrega cualquier componente (HospedajeItem, ServicioSimple o PaqueteCompuesto).
   */
  agregar(item) {
    if (!(item instanceof ComponenteCotizacion)) {
      throw new Error('[CotizacionReserva.agregar] El elemento debe ser instancia de ComponenteCotizacion.');
    }
    this.#items.push(item);
    return this;
  }

  /**
   * Remueve un componente.
   */
  eliminar(item) {
    const idx = this.#items.indexOf(item);
    if (idx !== -1) {
      this.#items.splice(idx, 1);
    }
    return this;
  }

  obtenerHijos() {
    return [...this.#items];
  }

  /**
   * Calcula el subtotal neto sumando recursivamente todos los componentes hijos.
   */
  calcularSubtotal() {
    let total = 0;
    for (const item of this.#items) {
      total += item.calcularPrecio();
    }
    return +total.toFixed(2);
  }

  /**
   * Calcula el monto de impuestos.
   */
  calcularImpuestos() {
    const subtotal = this.calcularSubtotal();
    return +(subtotal * (this.#impuestoPorcentaje / 100)).toFixed(2);
  }

  /**
   * Calcula el precio total = Subtotal + Impuestos
   */
  calcularPrecio() {
    const subtotal = this.calcularSubtotal();
    const impuestos = this.calcularImpuestos();
    return +(subtotal + impuestos).toFixed(2);
  }

  /**
   * Retorna el desglose global completo listo para auditoría o respuesta JSON.
   */
  obtenerDesglose() {
    const subtotal = this.calcularSubtotal();
    const impuestos = this.calcularImpuestos();
    const total = this.calcularPrecio();

    return {
      tipo: 'COTIZACION_RESERVA',
      subtotal,
      impuesto_porcentaje: this.#impuestoPorcentaje,
      impuestos,
      precio_total: total,
      total_elementos: this.#items.length,
      elementos: this.#items.map((it) => it.obtenerDesglose()),
    };
  }
}

export default CotizacionReserva;
