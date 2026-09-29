/**
 * Componente Base Abstracto (Component - Patrón Composite)
 * 
 * Declara la interfaz común para los elementos simples (hojas) y los
 * contenedores complejos (compuestos) dentro del árbol de cotización.
 */

export class ComponenteCotizacion {
  /**
   * Calcula y retorna el precio total del componente (incluyendo multiplicadores y descuentos si aplica).
   */
  calcularPrecio() {
    throw new Error(
      `[ComponenteCotizacion] El método 'calcularPrecio()' debe ser implementado por la subclase concreta (${this.constructor.name}).`
    );
  }

  /**
   * Retorna una representación estructurada (árbol de desglose) del componente.
   */
  obtenerDesglose() {
    throw new Error(
      `[ComponenteCotizacion] El método 'obtenerDesglose()' debe ser implementado por la subclase concreta (${this.constructor.name}).`
    );
  }

  /**
   * Retorna el nombre o identificador legible del componente.
   */
  obtenerNombre() {
    return this.constructor.name;
  }

  /**
   * Indica si el elemento actual es un contenedor compuesto (Composite) o una hoja terminal (Leaf).
   */
  esCompuesto() {
    return false;
  }
}

export default ComponenteCotizacion;
