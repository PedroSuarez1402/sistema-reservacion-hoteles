/**
 * Contenedor Compuesto (Composite - Patrón Composite)
 * 
 * Representa un Paquete Turístico o Combo que agrupa múltiples servicios o sub-paquetes.
 * Delega el cálculo del subtotal a sus componentes hijos de forma recursiva y aplica
 * un descuento porcentual sobre el subtotal resultante.
 */

import { ComponenteCotizacion } from './ComponenteCotizacion.js';

export class PaqueteCompuesto extends ComponenteCotizacion {
  #paqueteId;
  #nombre;
  #descuentoPorcentaje;
  #descripcion;
  #componentes = [];

  constructor({ paqueteId = null, nombre, descuentoPorcentaje = 0, descripcion = '' }) {
    super();
    if (!nombre || typeof nombre !== 'string') {
      throw new Error('[PaqueteCompuesto] El nombre del paquete es obligatorio.');
    }
    const desc = Math.min(100, Math.max(0, Number(descuentoPorcentaje) || 0));

    this.#paqueteId = paqueteId ? String(paqueteId).trim() : null;
    this.#nombre = String(nombre).trim();
    this.#descuentoPorcentaje = desc;
    this.#descripcion = String(descripcion || '').trim();
    this.#componentes = [];
  }

  get paqueteId() {
    return this.#paqueteId;
  }

  get nombre() {
    return this.#nombre;
  }

  get descuentoPorcentaje() {
    return this.#descuentoPorcentaje;
  }

  get descripcion() {
    return this.#descripcion;
  }

  esCompuesto() {
    return true;
  }

  obtenerNombre() {
    return this.#descuentoPorcentaje > 0
      ? `${this.#nombre} (-${this.#descuentoPorcentaje}% dto.)`
      : this.#nombre;
  }

  /**
   * Agrega un componente hijo (puede ser un ServicioSimple u otro PaqueteCompuesto).
   */
  agregar(componente) {
    if (!(componente instanceof ComponenteCotizacion)) {
      throw new Error('[PaqueteCompuesto.agregar] Solo se pueden agregar instancias de ComponenteCotizacion.');
    }
    this.#componentes.push(componente);
    return this;
  }

  /**
   * Remueve un componente hijo.
   */
  eliminar(componente) {
    const idx = this.#componentes.indexOf(componente);
    if (idx !== -1) {
      this.#componentes.splice(idx, 1);
    }
    return this;
  }

  /**
   * Retorna una copia inmutable de los componentes hijos.
   */
  obtenerHijos() {
    return [...this.#componentes];
  }

  /**
   * Calcula el subtotal bruto sumando recursivamente el precio de todos los hijos.
   */
  calcularSubtotalBruto() {
    let subtotal = 0;
    for (const hijo of this.#componentes) {
      subtotal += hijo.calcularPrecio();
    }
    return +subtotal.toFixed(2);
  }

  /**
   * Calcula el precio final aplicando el descuento sobre el subtotal bruto:
   * Total = SubtotalBruto * (1 - descuento / 100)
   */
  calcularPrecio() {
    const subtotalBruto = this.calcularSubtotalBruto();
    const factorDescuento = 1 - this.#descuentoPorcentaje / 100;
    return +(subtotalBruto * factorDescuento).toFixed(2);
  }

  /**
   * Retorna el árbol de desglose detallado.
   */
  obtenerDesglose() {
    const subtotalBruto = this.calcularSubtotalBruto();
    const precioFinal = this.calcularPrecio();
    const descuentoMonto = +(subtotalBruto - precioFinal).toFixed(2);

    return {
      tipo: 'PAQUETE_COMPUESTO',
      paquete_id: this.#paqueteId,
      nombre: this.#nombre,
      descripcion: this.#descripcion || undefined,
      descuento_porcentaje: this.#descuentoPorcentaje,
      subtotal_bruto: subtotalBruto,
      descuento_monto: descuentoMonto,
      total_neto: precioFinal,
      total_items: this.#componentes.length,
      componentes: this.#componentes.map((hijo) => hijo.obtenerDesglose()),
    };
  }
}

export default PaqueteCompuesto;
