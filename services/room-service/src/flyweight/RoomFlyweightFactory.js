/**
 * Patrón Flyweight (Refactoring.Guru) - Fábrica de Flyweights (RoomFlyweightFactory)
 *
 * Gestiona la piscina (pool) de objetos Flyweight en memoria RAM.
 * Antes de instanciar una nueva etiqueta o categoría de habitación, verifica si ya
 * existe en el Map en memoria. Si existe, devuelve la referencia compartida existente;
 * si no, la crea y la almacena para futuras habitaciones.
 */

import { TagFlyweight } from './TagFlyweight.js';
import { RoomCategoryFlyweight } from './RoomCategoryFlyweight.js';

const CATALOGO_CATEGORIAS_INTRINSECAS = {
  SENCILLA: {
    tipo: 'SENCILLA',
    capacidadMaxima: 1,
    tipoCama: '1 Cama Sencilla (Twin)',
    dimensionesM2: 20,
    checkInOut: 'Check-in 15:00 / Check-out 12:00',
  },
  DOBLE: {
    tipo: 'DOBLE',
    capacidadMaxima: 2,
    tipoCama: '2 Camas Sencillas o 1 Cama Queen',
    dimensionesM2: 32,
    checkInOut: 'Check-in 15:00 / Check-out 12:00',
  },
  SUITE: {
    tipo: 'SUITE',
    capacidadMaxima: 4,
    tipoCama: '1 Cama King Size + Sofá Cama',
    dimensionesM2: 55,
    checkInOut: 'Check-in 14:00 / Late Check-out 13:00',
  },
};

export class RoomFlyweightFactory {
  // Piscinas estáticas en memoria RAM para almacenar los estados intrínsecos únicos
  static #tagsPool = new Map();
  static #categoriesPool = new Map();

  // Contadores de telemetría para demostrar el ahorro de objetos en RAM
  static #solicitudesTotales = 0;
  static #reutilizacionesEnRam = 0;

  /**
   * Retorna un TagFlyweight compartido desde la piscina en RAM o lo crea si no existe.
   * @param {{ id: string, nombre: string, descripcion?: string }} tagData
   * @returns {TagFlyweight}
   */
  static getTagFlyweight(tagData) {
    const key = String(tagData.id).trim();
    this.#solicitudesTotales++;

    if (this.#tagsPool.has(key)) {
      this.#reutilizacionesEnRam++;
      return this.#tagsPool.get(key);
    }

    const nuevoFlyweight = new TagFlyweight({
      id: key,
      nombre: tagData.nombre,
      descripcion: tagData.descripcion,
    });
    this.#tagsPool.set(key, nuevoFlyweight);
    return nuevoFlyweight;
  }

  /**
   * Retorna un RoomCategoryFlyweight compartido según el tipo ('SENCILLA', 'DOBLE', 'SUITE').
   * @param {string} tipo
   * @returns {RoomCategoryFlyweight}
   */
  static getCategoryFlyweight(tipo) {
    const key = String(tipo || 'SENCILLA').trim().toUpperCase();
    this.#solicitudesTotales++;

    if (this.#categoriesPool.has(key)) {
      this.#reutilizacionesEnRam++;
      return this.#categoriesPool.get(key);
    }

    const specs = CATALOGO_CATEGORIAS_INTRINSECAS[key] || CATALOGO_CATEGORIAS_INTRINSECAS.SENCILLA;
    const nuevoFlyweight = new RoomCategoryFlyweight(specs);
    this.#categoriesPool.set(key, nuevoFlyweight);
    return nuevoFlyweight;
  }

  /**
   * Si un administrador actualiza o elimina una etiqueta del catálogo,
   * sincroniza o invalida esa entrada en el pool de memoria.
   */
  static invalidarEtiqueta(id) {
    if (!id) return;
    this.#tagsPool.delete(String(id).trim());
  }

  /**
   * Retorna estadísticas reales de uso de memoria RAM del patrón Flyweight.
   */
  static obtenerEstadisticasMemoria() {
    const instanciasEnRam = this.#tagsPool.size + this.#categoriesPool.size;
    return {
      etiquetas_unicas_en_ram: this.#tagsPool.size,
      categorias_unicas_en_ram: this.#categoriesPool.size,
      total_flyweights_en_ram: instanciasEnRam,
      solicitudes_totales_recibidas: this.#solicitudesTotales,
      objetos_reutilizados_ahorrados: this.#reutilizacionesEnRam,
    };
  }
}

export default RoomFlyweightFactory;
