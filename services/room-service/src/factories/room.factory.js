/**
 * Patrón Factory Method - Jerarquía de Creadores (Creators)
 * Declara el método fábrica para diferir la instanciación de habitaciones a subclases concretas.
 */
import {
    HabitacionSencilla,
    HabitacionDoble,
    HabitacionSuite,
} from './room.products.js';

// ==========================================
// 1. Creador Abstracto (Creator Base)
// ==========================================
export class CreadorHabitacion {
    /**
   * Método Fábrica (Factory Method)
   * Cada subclase concreta debe sobreescribirlo para retornar su producto específico.
   * @param {Object} datos
   * @returns {import('./room.products.js').HabitacionBase}
   */
    crearHabitacion(datos) {
        void datos;
        throw new Error(
            '[CreadorHabitacion.crearHabitacion] Método Factory abstracto no implementado. ' +
            'Cada subclase concreta (CreadorSencilla, etc.) debe sobre-escribirlo.'
        );
    }

    /**
   * Valida la estructura mínima de entrada antes de delegar la creación.
   */
    preparar(datos) {
        if (!datos || typeof datos !== 'object') {
            throw new Error('[CreadorHabitacion.preparar] Se esperaba un objeto de datos.');
        }
        const numeroLimpio = String(datos.numero ?? '').trim();
        if (!numeroLimpio) {
            throw new Error('[CreadorHabitacion.preparar] El número de habitación es obligatorio.');
        }
        // Delega la instanciación concreta al Factory Method
        return this.crearHabitacion(datos);
    }
}

// ==========================================
// 2. Creadores Concretos (Concrete Creators)
// ==========================================
export class CreadorSencilla extends CreadorHabitacion {
    crearHabitacion(datos) {
        return new HabitacionSencilla(datos);
    }
}

export class CreadorDoble extends CreadorHabitacion {
    crearHabitacion(datos) {
        return new HabitacionDoble(datos);
    }
}

export class CreadorSuite extends CreadorHabitacion {
    crearHabitacion(datos) {
        return new HabitacionSuite(datos);
    }
}

// ==========================================
// 3. Despachador de Fábrica (RoomFactory)
// ==========================================
/**
 * Punto de entrada único para el cliente (RoomService).
 * Mapea la categoría solicitada con su respectivo creador, evitando condicionales if/else.
 */
export class RoomFactory {

    static #creadores = Object.freeze({
        SENCILLA:  new CreadorSencilla(),
        DOBLE:     new CreadorDoble(),
        SUITE:     new CreadorSuite(),
        INDIVIDUAL: new CreadorSencilla(), // Alias compatible con 'SENCILLA'
    });

    /**
   * Resuelve el creador apropiado y ejecuta el flujo de preparación.
   */
    static fabricar(tipo, datos) {
        const clave = String(tipo ?? '').trim().toUpperCase() || 'SENCILLA';
        const creador = this.#creadores[clave];

        if (!creador) {
            throw new Error(
                `[RoomFactory] Tipo de habitación '${tipo}' no soportado. ` +
                `Valores oficiales permitidos: ${Object.keys(this.#creadores)
                    .filter((k) => !['INDIVIDUAL'].includes(k)) // ocultar alias al usuario
                    .join(', ')}.`
            );
        }

        return creador.preparar(datos);
    }
}
