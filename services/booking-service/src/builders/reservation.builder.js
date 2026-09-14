/**
 * Patrón Builder (Refactoring.Guru) - Construcción paso a paso de Reservaciones
 * Permite ensamblar de forma incremental un objeto complejo de reserva y centralizar
 * su validación antes de persistir en base de datos.
 */

import { BadRequestError } from '../utils/errors.util.js';

/**
 * Parsea una fecha en formato YYYY-MM-DD como fecha local (evita desfase horario UTC).
 */
function __localDate(input) {
    const str = String(input || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
    const d = new Date(str);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export class ReservationBuilder {
    // Estado interno encapsulado (campos privados)
    #usuarioId = null;
    #habitacionId = null;
    #fechaInicio = null;
    #fechaFin = null;
    #noches = 0;
    #precioNoche = null;
    #subtotal = null;
    #impuestos = null;
    #precioTotal = null;
    #estado = null;
    #notas = '';

    /**
   * Asocia el ID del huésped/usuario titular.
   */
    conHuesped(usuario_id) {
        this.#usuarioId = usuario_id;
        return this;
    }

    /**
   * Asocia el ID de la habitación (UUID desacoplado de Room Service).
   */
    paraHabitacion(habitacion_id) {
        this.#habitacionId = habitacion_id;
        return this;
    }

    /**
   * Asigna el rango de fechas y calcula automáticamente el número de noches.
   */
    conFechas(fecha_inicio, fecha_fin) {
        this.#fechaInicio = __localDate(fecha_inicio);
        this.#fechaFin = __localDate(fecha_fin);
        const diffMs = this.#fechaFin.getTime() - this.#fechaInicio.getTime();
        const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
        this.#noches = Math.max(0, dias);
        return this;
    }

    /**
   * Calcula el desglose de tarifa (subtotal, IVA 16% y total) según el número de noches.
   */
    calcularTarifa(precio_noche) {
        const pn = Number(precio_noche);
        this.#precioNoche = Number.isFinite(pn) ? pn : 0;
        const noches = this.#noches > 0 ? this.#noches : 1;
        this.#subtotal = +(this.#precioNoche * noches).toFixed(2);
        this.#impuestos = +(this.#subtotal * 0.16).toFixed(2);
        this.#precioTotal = +(this.#subtotal + this.#impuestos).toFixed(2);
        return this;
    }

    /**
   * Permite fijar un monto total precalculado o manual.
   */
    conTotalManual(total) {
        const t = Number(total);
        this.#precioTotal = Number.isFinite(t) ? +t.toFixed(2) : null;
        return this;
    }

    /**
   * Define el estado inicial de la reserva ('PENDIENTE', 'CONFIRMADA', etc.).
   */
    conEstado(estado = 'PENDIENTE') {
        this.#estado = estado;
        return this;
    }

    /**
   * Agrega observaciones internas a la reserva.
   */
    conNotas(notas) {
        this.#notas = String(notas ?? '').trim();
        return this;
    }

    /**
   * Método de construcción final (build): valida la integridad de los datos
   * y retorna el payload normalizado para Sequelize.
   */
    build() {
        const errores = [];

        if (!this.#usuarioId) errores.push('el usuario (huésped) es requerido');
        if (!this.#habitacionId || String(this.#habitacionId).trim() === '') errores.push('la habitación es requerida');

        if (!this.#fechaInicio || !this.#fechaFin) {
            errores.push('ambas fechas (llegada y salida) son requeridas');
        } else if (!(this.#fechaFin > this.#fechaInicio)) {
            errores.push('la fecha de salida debe ser estrictamente mayor a la fecha de llegada');
        } else if (this.#noches < 1) {
            errores.push('la reserva debe ser de al menos 1 noche');
        }

        if (this.#precioTotal === null || !Number.isFinite(this.#precioTotal)) {
            errores.push('el precio total no fue calculado (llame a calcularTarifa() o conTotalManual())');
        } else if (this.#precioTotal <= 0) {
            errores.push('el precio total debe ser mayor a 0');
        }

        const ESTADOS = new Set(['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'FINALIZADA']);
        const estadoFinal = (this.#estado || 'PENDIENTE').toString().toUpperCase();
        if (!ESTADOS.has(estadoFinal)) {
            errores.push(
                `estado inválido '${this.#estado}'. Permitidos: ${[...ESTADOS].join(', ')}`
            );
        }

        if (errores.length > 0) {
            const msg = 'No se pudo construir la reservación: ' + errores.join('; ') + '.';
            throw new BadRequestError(msg);
        }

        const isoDate = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Retorna el producto final formateado para el modelo
        return {
            usuario_id:    this.#usuarioId,
            habitacion_id: this.#habitacionId,
            fecha_inicio:  isoDate(this.#fechaInicio),
            fecha_fin:     isoDate(this.#fechaFin),
            precio_total:  +Number(this.#precioTotal).toFixed(2),
            estado:        estadoFinal,
            notas:         this.#notas,
        };
    }

    // Getters auxiliares para consulta durante la construcción
    get noches() { return this.#noches; }
    get subtotal() { return this.#subtotal; }
    get impuestos() { return this.#impuestos; }
    get precioTotal() { return this.#precioTotal; }
}

export default ReservationBuilder;
