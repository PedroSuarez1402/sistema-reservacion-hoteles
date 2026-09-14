/**
 * Patrón Factory Method (Refactoring.Guru) - Jerarquía de Productos (Products)
 * Define la interfaz base y las clases concretas que encapsulan los defaults de cada tipo de habitación.
 */

// ==========================================
// 1. Producto Base (Abstract Product)
// ==========================================

export class HabitacionBase {
    /**
   * Sanitiza valores y mapea solo los atributos reales de la tabla 'habitaciones'.
   */
    constructor(datos) {
        this.numero           = String(datos.numero ?? '').trim();
        this.descripcion      = String(datos.descripcion ?? '').trim();
        this.estado           = String(datos.estado ?? 'ACTIVA').trim().toUpperCase();
        this.precio_noche     = Number(datos.precio_noche);
        this.etiquetasSugeridas = Array.isArray(datos.etiquetasSugeridas) ? datos.etiquetasSugeridas : [];

        const ESTADOS_VIGENTES = new Set(['ACTIVA', 'MANTENIMIENTO', 'ELIMINADA']);
        if (!ESTADOS_VIGENTES.has(this.estado)) {
            throw new Error(
                `Estado '${this.estado}' no válido para la habitación ${this.numero}. ` +
                `Valores permitidos: ${[...ESTADOS_VIGENTES].join(', ')}`
            );
        }
    }

    /**
   * Retorna el payload exacto para la persistencia en Sequelize.
   */
    toDatabasePayload() {
        return {
            numero:       this.numero,
            tipo:         this.obtenerTipo(),
            precio_noche: Number.isFinite(this.precio_noche) ? this.precio_noche : null,
            descripcion:  this.descripcion,
            estado:       this.estado,
        };
    }

    /**
   * Método abstracto a implementar por cada producto concreto.
   */
    obtenerTipo() {
        throw new Error('El método obtenerTipo() debe ser implementado por la subclase concreta.');
    }
}

// ==========================================
// 2. Productos Concretos (Concrete Products)
// ==========================================
export class HabitacionSencilla extends HabitacionBase {
    constructor(datos) {
        super({
            ...datos,
            precio_noche:       Number.isFinite(Number(datos.precio_noche)) ? datos.precio_noche : 45.00,
            descripcion:        datos.descripcion || 'Habitación Sencilla (1 persona) con cama individual, escritorio, WiFi y aire acondicionado, ideal para viajes de negocios cortos.',
            etiquetasSugeridas: ['Wifi', 'Aire Acondicionado', 'Cama Sencilla', 'Escritorio de Trabajo', 'TV Cable'],
        });
    }

    obtenerTipo() { return 'SENCILLA'; }
}

/**
 * Producto Concreto: Habitación Doble (2 personas).
 */
export class HabitacionDoble extends HabitacionBase {
    constructor(datos) {
        super({
            ...datos,
            precio_noche:       Number.isFinite(Number(datos.precio_noche)) ? datos.precio_noche : 75.00,
            descripcion:        datos.descripcion || 'Habitación Doble (2 personas) con dos camas sencillas o una cama queen, vista interior, WiFi y balcón pequeño.',
            etiquetasSugeridas: ['Wifi', 'Aire Acondicionado', 'Cama Doble', 'Balcón', 'TV Cable', 'Armario Amplio'],
        });
    }

    obtenerTipo() { return 'DOBLE'; }
}

/**
 * Producto Concreto: Habitación Suite (ejecutiva / premium).
 */
export class HabitacionSuite extends HabitacionBase {
    constructor(datos) {
        super({
            ...datos,
            precio_noche:       Number.isFinite(Number(datos.precio_noche)) ? datos.precio_noche : 150.00,
            descripcion:        datos.descripcion || 'Suite Ejecutiva con zona de estar independiente, cama King size, minibar premium, balcón panorámico, jacuzzi y desayuno continental incluido.',
            etiquetasSugeridas: ['Jacuzzi', 'Cama King', 'Minibar VIP', 'Balcón Panorámico', 'Desayuno Incluido', 'Wifi 5G', 'Servicio a la Habitación 24h'],
        });
    }

    obtenerTipo() { return 'SUITE'; }
}
