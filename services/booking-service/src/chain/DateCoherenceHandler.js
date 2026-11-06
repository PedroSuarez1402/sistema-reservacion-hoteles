import BaseHandler from './BaseHandler.js';

/**
 * ESLABÓN 1: DateCoherenceHandler
 * Responsabilidad Única: Validar la coherencia temporal y cronológica de las fechas de estadía.
 * Corta la cadena de inmediato si las fechas están invertidas o en el pasado.
 */
export class DateCoherenceHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const fecha_inicio = context.fecha_inicio || context.fechaInicio;
    const fecha_fin = context.fecha_fin || context.fechaFin;

    if (!fecha_inicio || !fecha_fin) {
      const errorMsg = 'Ambas fechas (inicio y fin) son requeridas para la reserva.';
      context.logs.push(`[CORTE] [DateCoherenceHandler] ${errorMsg}`);
      context.trace.push({
        step: 'DateCoherenceHandler',
        name: 'Coherencia de Fechas y Cronología',
        passed: false,
        message: errorMsg,
        details: { fecha_inicio, fecha_fin },
      });
      return {
        success: false,
        handler: 'DateCoherenceHandler',
        error: errorMsg,
        context,
      };
    }

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      const errorMsg = 'Formato de fecha inválido. Se espera formato YYYY-MM-DD o ISO8601.';
      context.logs.push(`[CORTE] [DateCoherenceHandler] ${errorMsg}`);
      context.trace.push({
        step: 'DateCoherenceHandler',
        name: 'Coherencia de Fechas y Cronología',
        passed: false,
        message: errorMsg,
        details: { fecha_inicio, fecha_fin },
      });
      return {
        success: false,
        handler: 'DateCoherenceHandler',
        error: errorMsg,
        context,
      };
    }

    // Validación estricta: inicio debe ser estrictamente menor que fin
    if (inicio >= fin) {
      const errorMsg = `Incoherencia cronológica: La fecha de inicio (${fecha_inicio}) debe ser estrictamente anterior a la fecha de fin (${fecha_fin}).`;
      context.logs.push(`[CORTE] [DateCoherenceHandler] ${errorMsg}`);
      context.trace.push({
        step: 'DateCoherenceHandler',
        name: 'Coherencia de Fechas y Cronología',
        passed: false,
        message: errorMsg,
        details: { fecha_inicio, fecha_fin },
      });
      return {
        success: false,
        handler: 'DateCoherenceHandler',
        error: errorMsg,
        context,
      };
    }

    // Validación de fecha en el pasado
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioNormalizado = new Date(inicio);
    inicioNormalizado.setHours(0, 0, 0, 0);

    if (inicioNormalizado < hoy && !context.isHistoricalSimulation) {
      const errorMsg = `Fecha extemporánea: La fecha de llegada (${fecha_inicio}) no puede ser anterior a la fecha actual.`;
      context.logs.push(`[CORTE] [DateCoherenceHandler] ${errorMsg}`);
      context.trace.push({
        step: 'DateCoherenceHandler',
        name: 'Coherencia de Fechas y Cronología',
        passed: false,
        message: errorMsg,
        details: { fecha_inicio, fecha_fin },
      });
      return {
        success: false,
        handler: 'DateCoherenceHandler',
        error: errorMsg,
        context,
      };
    }

    const diffMs = fin.getTime() - inicio.getTime();
    const noches = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    // Enriquecer el contexto para los siguientes eslabones
    context.inicioDate = inicio;
    context.finDate = fin;
    context.noches = noches;
    context.fecha_inicio = fecha_inicio;
    context.fecha_fin = fecha_fin;

    const successMsg = `Fechas coherentes y cronológicamente válidas: ${fecha_inicio} a ${fecha_fin} (${noches} noche(s)).`;
    context.logs.push(`[OK] [DateCoherenceHandler] ${successMsg} Cadena continúa.`);
    context.trace.push({
      step: 'DateCoherenceHandler',
      name: 'Coherencia de Fechas y Cronología',
      passed: true,
      message: successMsg,
      details: { noches, fecha_inicio, fecha_fin },
    });

    return await super.handle(context);
  }
}

export default DateCoherenceHandler;
