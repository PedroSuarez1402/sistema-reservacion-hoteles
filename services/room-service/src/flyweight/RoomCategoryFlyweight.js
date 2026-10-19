/**
 * Patrón Flyweight (Refactoring.Guru) - Flyweight Concreto: Categoría de Habitación (RoomCategoryFlyweight)
 *
 * Almacena el ESTADO INTRÍNSECO (compartido e inmutable) común a todas las habitaciones
 * que pertenecen a una misma categoría ('SENCILLA', 'DOBLE', 'SUITE').
 * Así, si el hotel tiene 300 habitaciones físicas, en memoria RAM solo existen 3 instancias
 * de RoomCategoryFlyweight.
 */

export class RoomCategoryFlyweight {
  #tipo;
  #capacidadMaxima;
  #tipoCama;
  #dimensionesM2;
  #checkInOut;

  constructor({ tipo, capacidadMaxima, tipoCama, dimensionesM2, checkInOut }) {
    this.#tipo = String(tipo).trim().toUpperCase();
    this.#capacidadMaxima = Number(capacidadMaxima);
    this.#tipoCama = String(tipoCama).trim();
    this.#dimensionesM2 = Number(dimensionesM2);
    this.#checkInOut = String(checkInOut).trim();

    // Inmutabilidad garantizada del estado intrínseco
    Object.freeze(this);
  }

  get tipo() {
    return this.#tipo;
  }

  get capacidadMaxima() {
    return this.#capacidadMaxima;
  }

  get tipoCama() {
    return this.#tipoCama;
  }

  get dimensionesM2() {
    return this.#dimensionesM2;
  }

  get checkInOut() {
    return this.#checkInOut;
  }

  /**
   * Operación del Flyweight que combina el estado intrínseco compartido
   * con el estado extrínseco único de la habitación pasado por parámetro.
   */
  operacion({ numero, precioNoche, estado }) {
    return `Habitación #${numero} [${this.#tipo} - Máx. ${this.#capacidadMaxima} pax, ${this.#dimensionesM2}m²] - $${precioNoche}/noche (${estado})`;
  }

  /**
   * Retorna los metadatos intrínsecos compartidos de la categoría.
   */
  obtenerEstadoIntrinseco() {
    return {
      tipo: this.#tipo,
      capacidad_maxima: this.#capacidadMaxima,
      tipo_cama: this.#tipoCama,
      dimensiones_m2: this.#dimensionesM2,
      politica_check_in_out: this.#checkInOut,
    };
  }
}

export default RoomCategoryFlyweight;
