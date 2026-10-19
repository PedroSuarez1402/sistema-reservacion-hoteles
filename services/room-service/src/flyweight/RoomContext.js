/**
 * Patrón Flyweight (Refactoring.Guru) - Contexto (RoomContext)
 *
 * Almacena el ESTADO EXTRÍNSECO único de cada habitación física del hotel
 * (id, número de puerta, precio por noche específico, estado actual, imágenes)
 * y mantiene referencias a los objetos Flyweight compartidos en memoria RAM
 * (categoría y etiquetas).
 */

import { RoomFlyweightFactory } from './RoomFlyweightFactory.js';

export class RoomContext {
  // Estado Extrínseco (único de cada puerta física)
  #id;
  #numero;
  #precioNoche;
  #estado;
  #descripcion;
  #imagenes;
  #createdAt;
  #updatedAt;

  // Referencias al Estado Intrínseco compartido en RAM (Flyweights)
  #categoryFlyweight;
  #tagFlyweights;

  /**
   * Construye el contexto de una habitación separando su estado extrínseco
   * y obteniendo las referencias compartidas desde RoomFlyweightFactory.
   * @param {Object} rawRoom - Instancia de Sequelize o objeto plano de la habitación
   */
  constructor(rawRoom) {
    const plain = typeof rawRoom?.toJSON === 'function' ? rawRoom.toJSON() : { ...rawRoom };

    // 1. Guardar Estado Extrínseco (propio de esta habitación individual)
    this.#id = plain.id;
    this.#numero = plain.numero;
    this.#precioNoche = plain.precio_noche;
    this.#estado = plain.estado;
    this.#descripcion = plain.descripcion;
    this.#imagenes = Array.isArray(plain.imagenes) ? plain.imagenes : [];
    this.#createdAt = plain.createdAt;
    this.#updatedAt = plain.updatedAt;

    // 2. Obtener referencia compartida al Flyweight de Categoría (Estado Intrínseco)
    this.#categoryFlyweight = RoomFlyweightFactory.getCategoryFlyweight(plain.tipo);

    // 3. Obtener referencias compartidas a los Flyweights de Etiquetas (Estado Intrínseco)
    const rawTags = Array.isArray(plain.etiquetas) ? plain.etiquetas : [];
    this.#tagFlyweights = rawTags.map((tag) => RoomFlyweightFactory.getTagFlyweight(tag));
  }

  get id() {
    return this.#id;
  }

  get numero() {
    return this.#numero;
  }

  get tipo() {
    return this.#categoryFlyweight.tipo;
  }

  get precio_noche() {
    return this.#precioNoche;
  }

  get estado() {
    return this.#estado;
  }

  get descripcion() {
    return this.#descripcion;
  }

  get imagenes() {
    return this.#imagenes;
  }

  get categoryFlyweight() {
    return this.#categoryFlyweight;
  }

  get tagFlyweights() {
    return this.#tagFlyweights;
  }

  get etiquetas() {
    return this.#tagFlyweights.map((fw) => fw.obtenerEstadoIntrinseco());
  }

  /**
   * Combina el estado extrínseco de la habitación con el estado intrínseco
   * compartido de sus Flyweights para serializar la respuesta JSON.
   */
  toJSON() {
    return {
      id: this.#id,
      numero: this.#numero,
      tipo: this.#categoryFlyweight.tipo,
      precio_noche: this.#precioNoche,
      estado: this.#estado,
      descripcion: this.#descripcion,
      especificaciones_tipo: this.#categoryFlyweight.obtenerEstadoIntrinseco(),
      etiquetas: this.#tagFlyweights.map((fw) => fw.obtenerEstadoIntrinseco()),
      imagenes: this.#imagenes,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }
}

export default RoomContext;
