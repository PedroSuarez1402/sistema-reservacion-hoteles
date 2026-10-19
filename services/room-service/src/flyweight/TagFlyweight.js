/**
 * Patrón Flyweight (Refactoring.Guru) - Flyweight Concreto: Etiqueta (TagFlyweight)
 *
 * Almacena el ESTADO INTRÍNSECO (compartido e inmutable) de una etiqueta del catálogo
 * (ej. "WiFi", "Aire Acondicionado", "Jacuzzi").
 * En lugar de crear un objeto de etiqueta nuevo por cada una de las cientos de habitaciones
 * que la poseen, todas las habitaciones apuntan a la misma instancia en memoria RAM.
 */

export class TagFlyweight {
  #id;
  #nombre;
  #descripcion;

  constructor({ id, nombre, descripcion = null }) {
    if (!id || !nombre) {
      throw new Error('[TagFlyweight] El id y el nombre son obligatorios para el estado intrínseco.');
    }

    this.#id = String(id).trim();
    this.#nombre = String(nombre).trim();
    this.#descripcion = descripcion ? String(descripcion).trim() : null;

    // El estado intrínseco de un Flyweight debe ser inmutable
    Object.freeze(this);
  }

  get id() {
    return this.#id;
  }

  get nombre() {
    return this.#nombre;
  }

  get descripcion() {
    return this.#descripcion;
  }

  /**
   * Operación del Flyweight que recibe el estado extrínseco (ej. número de habitación)
   * sin almacenarlo dentro del Flyweight.
   */
  operacion(numeroHabitacion) {
    return `Etiqueta [${this.#nombre}] compartida en habitación #${numeroHabitacion}`;
  }

  /**
   * Retorna la representación plana del estado intrínseco compartido.
   */
  obtenerEstadoIntrinseco() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      descripcion: this.#descripcion,
    };
  }
}

export default TagFlyweight;
