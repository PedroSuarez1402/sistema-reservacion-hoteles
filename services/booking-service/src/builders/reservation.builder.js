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
    #clienteId = null;
    #usuarioId = null;
    #acompanantes = [];
    #habitacionId = null;
    #paqueteId = null;
    #fechaInicio = null;
    #fechaFin = null;
    #noches = 0;
    #precioNoche = null;
    #subtotal = null;
    #impuestos = null;
    #precioTotal = null;
    #estado = null;
    #notas = '';
    #cotizacion = null;
    #metodoPago = 'EFECTIVO';
    #tipoReserva = 'ANTICIPADA';
    #anticipo = 0.00;
    #esProrroga = false;
    #observacionesRecepcion = null;

    /**
   * Asocia el ID del cliente titular de la reservación (modelo Cliente).
   */
    conCliente(cliente_id) {
        this.#clienteId = cliente_id ? String(cliente_id).trim() : null;
        return this;
    }

    /**
   * Asocia el ID del usuario titular (o usuario staff que gestiona la reserva).
   */
    conHuesped(usuario_id) {
        this.#usuarioId = usuario_id ? String(usuario_id).trim() : null;
        if (!this.#clienteId && this.#usuarioId) {
            this.#clienteId = this.#usuarioId;
        }
        return this;
    }

    /**
   * Asocia la lista de acompañantes registrados para esta estancia (con deduplicación).
   */
    conAcompanantes(lista) {
        if (Array.isArray(lista)) {
            const seenDocs = new Set();
            const seenNames = new Set();
            const cleanList = [];

            for (const a of lista) {
                if (!a || !a.nombre || String(a.nombre).trim().length === 0) continue;
                const nombre = String(a.nombre).trim();
                const doc = a.documento ? String(a.documento).trim() : null;
                const nameKey = nombre.toLowerCase();
                const docKey = doc ? doc.toLowerCase() : null;

                // Evitar duplicados dentro de la lista
                if (docKey && seenDocs.has(docKey)) continue;
                if (seenNames.has(nameKey)) continue;

                if (docKey) seenDocs.add(docKey);
                seenNames.add(nameKey);

                cleanList.push({
                    nombre,
                    documento: doc,
                    parentesco: a.parentesco ? String(a.parentesco).trim() : 'Familiar',
                    telefono: a.telefono ? String(a.telefono).trim() : null,
                });
            }
            this.#acompanantes = cleanList;
        }
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
   * Asocia el ID del paquete turístico seleccionado (opcional).
   */
    conPaquete(paquete_id) {
        this.#paqueteId = paquete_id ? String(paquete_id).trim() : null;
        return this;
    }

    /**
   * Asocia una estructura del Patrón Composite (CotizacionReserva) para calcular y desglosar el precio total.
   * @param {import('../composite/CotizacionReserva.js').CotizacionReserva} cotizacion
   */
    conCotizacion(cotizacion) {
        if (cotizacion && typeof cotizacion.calcularPrecio === 'function') {
            this.#cotizacion = cotizacion;
            this.#precioTotal = cotizacion.calcularPrecio();
            if (typeof cotizacion.calcularSubtotal === 'function') {
                this.#subtotal = cotizacion.calcularSubtotal();
            }
            if (typeof cotizacion.calcularImpuestos === 'function') {
                this.#impuestos = cotizacion.calcularImpuestos();
            }
        }
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
   * Define el método de pago ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA').
   */
    conMetodoPago(metodo) {
        if (metodo !== undefined && metodo !== null) {
            this.#metodoPago = String(metodo).trim().toUpperCase();
        }
        return this;
    }

    /**
   * Define el tipo de reservación ('INMEDIATA' o 'ANTICIPADA').
   */
    conTipoReserva(tipo) {
        if (tipo !== undefined && tipo !== null) {
            this.#tipoReserva = String(tipo).trim().toUpperCase();
        }
        return this;
    }

    /**
   * Define el valor de anticipo o abono inicial.
   */
    conAnticipo(monto) {
        const val = Number(monto);
        this.#anticipo = Number.isFinite(val) && val >= 0 ? +val.toFixed(2) : 0.00;
        return this;
    }

    /**
   * Indica si la reservación corresponde a una prórroga de estancia.
   */
    conProrroga(bool) {
        this.#esProrroga = Boolean(bool);
        return this;
    }

    /**
   * Registra notas u observaciones operativas de recepción.
   */
    conObservacionesRecepcion(texto) {
        this.#observacionesRecepcion = texto !== undefined && texto !== null ? String(texto).trim() : null;
        return this;
    }

    /**
   * Método de construcción final (build): valida la integridad de los datos
   * y retorna el payload normalizado para Sequelize.
   */
    build() {
        const errores = [];

        const targetClienteId = this.#clienteId || this.#usuarioId;
        if (!targetClienteId) errores.push('el cliente titular es requerido');
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

        const METODOS = new Set(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']);
        const metodoFinal = (this.#metodoPago || 'EFECTIVO').toString().toUpperCase();
        if (!METODOS.has(metodoFinal)) {
            errores.push(
                `método de pago inválido '${this.#metodoPago}'. Permitidos: ${[...METODOS].join(', ')}`
            );
        }

        const TIPOS_RESERVA = new Set(['INMEDIATA', 'ANTICIPADA']);
        const tipoReservaFinal = (this.#tipoReserva || 'ANTICIPADA').toString().toUpperCase();
        if (!TIPOS_RESERVA.has(tipoReservaFinal)) {
            errores.push(
                `tipo de reserva inválido '${this.#tipoReserva}'. Permitidos: ${[...TIPOS_RESERVA].join(', ')}`
            );
        }

        if (this.#anticipo < 0) {
            errores.push('el anticipo no puede ser un valor negativo');
        }

        if (errores.length > 0) {
            const msg = 'No se pudo construir la reservación: ' + errores.join('; ') + '.';
            throw new BadRequestError(msg);
        }

        const isoDate = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Retorna el producto final formateado para el modelo
        return {
            cliente_id:              targetClienteId,
            usuario_id:              this.#usuarioId,
            acompanantes:            this.#acompanantes,
            habitacion_id:           this.#habitacionId,
            paquete_id:              this.#paqueteId,
            fecha_inicio:            isoDate(this.#fechaInicio),
            fecha_fin:               isoDate(this.#fechaFin),
            precio_total:            +Number(this.#precioTotal).toFixed(2),
            estado:                  estadoFinal,
            metodo_pago:             metodoFinal,
            tipo_reserva:            tipoReservaFinal,
            es_prorroga:             this.#esProrroga,
            anticipo:                +Number(this.#anticipo).toFixed(2),
            observaciones_recepcion: this.#observacionesRecepcion,
            notas:                   this.#notas,
        };
    }

    // Getters auxiliares para consulta durante la construcción
    get clienteId() { return this.#clienteId; }
    get acompanantes() { return this.#acompanantes; }
    get noches() { return this.#noches; }
    get subtotal() { return this.#subtotal; }
    get impuestos() { return this.#impuestos; }
    get precioTotal() { return this.#precioTotal; }
    get cotizacion() { return this.#cotizacion; }
    get metodoPago() { return this.#metodoPago; }
    get tipoReserva() { return this.#tipoReserva; }
    get anticipo() { return this.#anticipo; }
    get esProrroga() { return this.#esProrroga; }
    get observacionesRecepcion() { return this.#observacionesRecepcion; }
}

export default ReservationBuilder;
