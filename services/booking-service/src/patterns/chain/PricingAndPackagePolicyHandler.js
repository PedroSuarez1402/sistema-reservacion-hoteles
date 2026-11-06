/**
 * Patrón Chain of Responsibility - Eslabón Concreto #4: PricingAndPackagePolicyHandler
 *
 * Responsabilidad:
 * - Validar las reglas de negocio sobre paquetes turísticos seleccionados (`paquete_id`)
 *   y servicios adicionales (`servicios_adicionales`).
 * - Verificar que el paquete exista, esté 'ACTIVO', tenga un descuento válido (0% - 100%)
 *   y que sus servicios incluidos estén activos y con precios válidos.
 * - Validar políticas de precio manual (`precio_total`) y anticipo (`anticipo`).
 * - Dejar precargadas las entidades (`context.paqueteDB`, `context.serviciosAdicionalesResueltos`)
 *   para que el Patrón Composite arme el árbol de costos sin consultas redundantes.
 */

import { ReservationValidationHandler } from './ReservationValidationHandler.js';
import { Paquete, Servicio } from '../../models/index.js';
import {
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
} from '../../utils/errors.util.js';

export class PricingAndPackagePolicyHandler extends ReservationValidationHandler {
  async handle(context) {
    const stepName = 'Validación de Políticas de Paquetes, Servicios y Tarifas';
    const {
      paquete_id,
      servicios_adicionales,
      precio_total,
      anticipo,
    } = context;

    let paqueteVerificado = null;
    const serviciosVerificados = [];

    // 1. Validación de Paquete Turístico (si fue seleccionado)
    if (paquete_id) {
      let paqueteDB = context.paqueteDB || (context.paquetesCatalog && context.paquetesCatalog[paquete_id]) || null;
      if (!paqueteDB) {
        try {
          paqueteDB = await Paquete.findByPk(paquete_id, {
            include: [
              {
                model: Servicio,
                as: 'servicios',
                through: { attributes: ['cantidad'] },
              },
            ],
          });
        } catch (_dbErr) {
          paqueteDB = null;
        }
      }

      if (!paqueteDB) {
        this.failWithTrace(
          context,
          new NotFoundError('El paquete turístico seleccionado no existe'),
          {
            step: stepName,
            message: `El paquete_id '${paquete_id}' no existe en la base de datos.`,
            details: { paquete_id },
          }
        );
      }

      if (String(paqueteDB.estado || 'ACTIVO').toUpperCase() !== 'ACTIVO') {
        this.failWithTrace(
          context,
          new UnprocessableEntityError(
            `El paquete turístico '${paqueteDB.nombre}' se encuentra INACTIVO y no puede asociarse a nuevas reservas`
          ),
          {
            step: stepName,
            message: `Paquete '${paqueteDB.nombre}' rechazado por estar en estado ${paqueteDB.estado}.`,
            details: {
              paquete_id: paqueteDB.id,
              nombre: paqueteDB.nombre,
              estado: paqueteDB.estado,
            },
          }
        );
      }

      const desc = Number(paqueteDB.descuento_porcentaje) || 0;
      if (desc < 0 || desc > 100) {
        this.failWithTrace(
          context,
          new BadRequestError(
            `El paquete '${paqueteDB.nombre}' tiene un porcentaje de descuento inválido (${desc}%)`
          ),
          {
            step: stepName,
            message: `Descuento fuera de rango permitido (0-100%): ${desc}%.`,
            details: { paquete_id: paqueteDB.id, descuento_porcentaje: desc },
          }
        );
      }

      if (Array.isArray(paqueteDB.servicios)) {
        for (const serv of paqueteDB.servicios) {
          if (String(serv.estado || 'ACTIVO').toUpperCase() !== 'ACTIVO') {
            this.failWithTrace(
              context,
              new UnprocessableEntityError(
                `El servicio '${serv.nombre}' incluido en el paquete '${paqueteDB.nombre}' está INACTIVO`
              ),
              {
                step: stepName,
                message: `Servicio '${serv.nombre}' del paquete '${paqueteDB.nombre}' está INACTIVO.`,
                details: {
                  paquete_id: paqueteDB.id,
                  servicio_id: serv.id,
                  servicio_nombre: serv.nombre,
                },
              }
            );
          }
        }
      }

      context.paqueteDB = paqueteDB;
      paqueteVerificado = {
        id: paqueteDB.id,
        nombre: paqueteDB.nombre,
        descuento_porcentaje: desc,
        servicios_incluidos: Array.isArray(paqueteDB.servicios) ? paqueteDB.servicios.length : 0,
      };
    }

    // 2. Validación de Servicios Adicionales sueltos (si el cliente envía un array opcional)
    if (Array.isArray(servicios_adicionales) && servicios_adicionales.length > 0) {
      for (const item of servicios_adicionales) {
        const servicioId = typeof item === 'string' ? item : item?.servicio_id || item?.id;
        const cantidad = typeof item === 'object' && item !== null ? Number(item.cantidad ?? 1) : 1;

        if (!servicioId) {
          this.failWithTrace(
            context,
            new BadRequestError('Cada servicio adicional debe especificar un ID válido'),
            {
              step: stepName,
              message: 'Elemento en servicios_adicionales sin ID.',
              details: { item },
            }
          );
        }

        if (!Number.isFinite(cantidad) || cantidad < 1) {
          this.failWithTrace(
            context,
            new BadRequestError('La cantidad de cada servicio adicional debe ser al menos 1'),
            {
              step: stepName,
              message: `Cantidad inválida (${cantidad}) para el servicio ${servicioId}.`,
              details: { servicio_id: servicioId, cantidad },
            }
          );
        }

        const servDB = await Servicio.findByPk(servicioId);
        if (!servDB) {
          this.failWithTrace(
            context,
            new NotFoundError(`El servicio adicional (${servicioId}) no existe`),
            {
              step: stepName,
              message: `Servicio adicional ${servicioId} no encontrado en BD.`,
              details: { servicio_id: servicioId },
            }
          );
        }

        if (String(servDB.estado || 'ACTIVO').toUpperCase() !== 'ACTIVO') {
          this.failWithTrace(
            context,
            new UnprocessableEntityError(
              `El servicio adicional '${servDB.nombre}' está INACTIVO y no puede contratarse`
            ),
            {
              step: stepName,
              message: `Servicio adicional '${servDB.nombre}' inactivo.`,
              details: { servicio_id: servDB.id, nombre: servDB.nombre, estado: servDB.estado },
            }
          );
        }

        serviciosVerificados.push({
          servicio: servDB,
          cantidad: Math.round(cantidad),
        });
      }
    }

    context.serviciosAdicionalesResueltos = serviciosVerificados;

    // 3. Validación de políticas de precio manual y anticipo
    if (precio_total !== undefined && precio_total !== null && precio_total !== '') {
      const precioNum = Number(precio_total);
      if (!Number.isFinite(precioNum) || precioNum <= 0) {
        this.failWithTrace(
          context,
          new BadRequestError('El precio total debe ser un número mayor a 0'),
          {
            step: stepName,
            message: `Precio total manual inválido: '${precio_total}'.`,
            details: { precio_total },
          }
        );
      }
    }

    if (anticipo !== undefined && anticipo !== null && anticipo !== '') {
      const anticipoNum = Number(anticipo);
      if (!Number.isFinite(anticipoNum) || anticipoNum < 0) {
        this.failWithTrace(
          context,
          new BadRequestError('El anticipo no puede ser un valor negativo'),
          {
            step: stepName,
            message: `Anticipo inválido: '${anticipo}'.`,
            details: { anticipo },
          }
        );
      }
    }

    const tienePrecioHabitacion =
      Number.isFinite(Number(context.precioNocheHabitacion)) &&
      Number(context.precioNocheHabitacion) > 0;
    const tienePrecioManual =
      precio_total !== undefined &&
      precio_total !== null &&
      precio_total !== '' &&
      Number(precio_total) > 0;

    if (!tienePrecioHabitacion && !tienePrecioManual) {
      this.failWithTrace(
        context,
        new BadRequestError(
          'No se pudo determinar la tarifa de la habitación y no se proporcionó un precio_total válido'
        ),
        {
          step: stepName,
          message: 'Sin tarifa base de habitación ni precio_total manual.',
          details: {
            habitacion_id: context.habitacionIdNormalizado,
            precio_total,
          },
        }
      );
    }

    this.recordTrace(context, {
      handler: 'PricingAndPackagePolicyHandler',
      step: stepName,
      status: 'PASSED',
      message: paqueteVerificado
        ? `Políticas aprobadas con paquete '${paqueteVerificado.nombre}' (-${paqueteVerificado.descuento_porcentaje}% dto.) y ${serviciosVerificados.length} servicio(s) extra.`
        : `Políticas de tarifa aprobadas (sin paquete adicional, ${serviciosVerificados.length} servicio(s) extra).`,
      details: {
        paquete: paqueteVerificado,
        servicios_adicionales_count: serviciosVerificados.length,
        tarifa_noche_base: context.precioNocheHabitacion || null,
        precio_manual_enviado: tienePrecioManual ? Number(precio_total) : null,
      },
    });

    return await super.handle(context);
  }
}

export default PricingAndPackagePolicyHandler;
