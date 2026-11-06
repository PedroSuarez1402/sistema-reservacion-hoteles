/**
 * Patrón Chain of Responsibility - Eslabón Concreto #1: DateCoherenceHandler
 *
 * Responsabilidad:
 * - Validar que `fecha_inicio` y `fecha_fin` existan y tengan formato válido.
 * - Verificar que `fecha_inicio < fecha_fin` (mínimo 1 noche de estancia).
 * - Verificar que `fecha_inicio` no sea una fecha en el pasado.
 * - Calcular `diasReserva` y normalizar las fechas en el contexto para los siguientes eslabones.
 */

import { ReservationValidationHandler } from './ReservationValidationHandler.js';
import { BadRequestError } from '../../utils/errors.util.js';

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(input) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 0, 0, 0, 0);
  }
  const str = String(input || '').trim();
  const m = ISO_DATE_REGEX.exec(str);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }
    return d;
  }
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

export function formatIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export class DateCoherenceHandler extends ReservationValidationHandler {
  async handle(context) {
    const stepName = 'Validación de Coherencia de Fechas';
    const { fecha_inicio, fecha_fin, skipPastDateCheck = false } = context;

    if (!fecha_inicio) {
      this.failWithTrace(context, new BadRequestError('La fecha de inicio es requerida'), {
        step: stepName,
        message: 'Falta el campo obligatorio fecha_inicio.',
      });
    }

    if (!fecha_fin) {
      this.failWithTrace(context, new BadRequestError('La fecha de fin es requerida'), {
        step: stepName,
        message: 'Falta el campo obligatorio fecha_fin.',
      });
    }

    const inicio = parseLocalDate(fecha_inicio);
    const fin = parseLocalDate(fecha_fin);

    if (!inicio || !fin) {
      this.failWithTrace(
        context,
        new BadRequestError('Formato de fechas inválido. Utilice el formato YYYY-MM-DD'),
        {
          step: stepName,
          message: `Formato de fechas inválido: inicio='${fecha_inicio}', fin='${fecha_fin}'.`,
          details: { fecha_inicio, fecha_fin },
        }
      );
    }

    if (inicio >= fin) {
      this.failWithTrace(
        context,
        new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin'),
        {
          step: stepName,
          message: `Incoherencia temporal: fecha_inicio (${formatIsoDate(
            inicio
          )}) >= fecha_fin (${formatIsoDate(fin)}).`,
          details: {
            fecha_inicio: formatIsoDate(inicio),
            fecha_fin: formatIsoDate(fin),
          },
        }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedInicio = new Date(inicio);
    normalizedInicio.setHours(0, 0, 0, 0);

    if (!skipPastDateCheck && normalizedInicio < today) {
      this.failWithTrace(
        context,
        new BadRequestError('La fecha de inicio no puede ser anterior al día actual'),
        {
          step: stepName,
          message: `La fecha de llegada (${formatIsoDate(
            normalizedInicio
          )}) está en el pasado respecto a hoy (${formatIsoDate(today)}).`,
          details: {
            fecha_inicio: formatIsoDate(normalizedInicio),
            hoy: formatIsoDate(today),
          },
        }
      );
    }

    const diffMs = fin.getTime() - inicio.getTime();
    const diasReserva = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    context.inicioDate = inicio;
    context.finDate = fin;
    context.diasReserva = diasReserva;
    context.fechaInicioIso = formatIsoDate(inicio);
    context.fechaFinIso = formatIsoDate(fin);

    this.recordTrace(context, {
      handler: 'DateCoherenceHandler',
      step: stepName,
      status: 'PASSED',
      message: `Fechas coherentes: ${context.fechaInicioIso} → ${context.fechaFinIso} (${diasReserva} noche(s)).`,
      details: {
        fecha_inicio: context.fechaInicioIso,
        fecha_fin: context.fechaFinIso,
        noches: diasReserva,
      },
    });

    return await super.handle(context);
  }
}

export default DateCoherenceHandler;
