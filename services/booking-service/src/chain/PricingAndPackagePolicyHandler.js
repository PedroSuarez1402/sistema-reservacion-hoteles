import BaseHandler from './BaseHandler.js';

/**
 * ESLABÓN 4: PricingAndPackagePolicyHandler
 * Responsabilidad Única: Validar políticas comerciales, paquetes turísticos asociados y reglas de estancia mínima.
 * Corta la cadena si un paquete no cumple con las políticas de noches mínimas o vigencia.
 * Una vez superado este eslabón, la solicitud está 100% validada y lista para Composite + Builder.
 */
export class PricingAndPackagePolicyHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const { paquete_id, noches, catalogoPaquetes, paqueteRepository } = context;

    if (paquete_id) {
      let paquete = null;

      if (context.paquete) {
        paquete = context.paquete;
      } else if (context.paqueteDB) {
        paquete = context.paqueteDB;
      } else if (catalogoPaquetes && catalogoPaquetes instanceof Map) {
        paquete = catalogoPaquetes.get(paquete_id);
      } else if (catalogoPaquetes && typeof catalogoPaquetes === 'object') {
        paquete = catalogoPaquetes[paquete_id];
      } else if (paqueteRepository && typeof paqueteRepository.findByPk === 'function') {
        try {
          paquete = await paqueteRepository.findByPk(paquete_id);
        } catch (_) {}
      } else {
        paquete = {
          id: paquete_id,
          nombre: 'Plan Ecoturístico Selva Viva',
          descuento_porcentaje: 15,
          noches_minimas: 2,
          servicios: [
            { id: 'srv-1', nombre: 'Desayuno Campesino Orgánico', precio: 30000, cantidad: 2 },
            { id: 'srv-2', nombre: 'Guianza Ecológica y Senderismo', precio: 75000, cantidad: 1 },
          ],
        };
      }

      if (!paquete) {
        const errorMsg = `Paquete inexistente: El paquete turístico con ID '${paquete_id}' no fue encontrado.`;
        context.logs.push(`[CORTE] [PricingAndPackagePolicyHandler] ${errorMsg}`);
        context.trace.push({
          step: 'PricingAndPackagePolicyHandler',
          name: 'Políticas de Paquetes y Tarifas',
          passed: false,
          message: errorMsg,
        });
        return {
          success: false,
          handler: 'PricingAndPackagePolicyHandler',
          error: errorMsg,
          context,
        };
      }

      // Regla de política: Estancia mínima exigida por el paquete
      const nochesMinimas = Number(paquete.noches_minimas) || 1;
      const nochesSolicitadas = Number(noches) || 1;

      if (nochesSolicitadas < nochesMinimas) {
        const errorMsg = `Incumplimiento de política: El paquete '${paquete.nombre}' exige una estadía mínima de ${nochesMinimas} noches (se solicitaron ${nochesSolicitadas} noche(s)).`;
        context.logs.push(`[CORTE] [PricingAndPackagePolicyHandler] ${errorMsg}`);
        context.trace.push({
          step: 'PricingAndPackagePolicyHandler',
          name: 'Políticas de Paquetes y Tarifas',
          passed: false,
          message: errorMsg,
          details: { nochesSolicitadas, nochesMinimas },
        });
        return {
          success: false,
          handler: 'PricingAndPackagePolicyHandler',
          error: errorMsg,
          context,
        };
      }

      context.paquete = paquete;
      const successMsg = `Paquete '${paquete.nombre}' validado: Estadía mínima cumplida (${nochesSolicitadas} >= ${nochesMinimas} noches). Descuento comercial aplicado: ${paquete.descuento_porcentaje}%.`;
      context.logs.push(`[OK] [PricingAndPackagePolicyHandler] ${successMsg}`);
      context.trace.push({
        step: 'PricingAndPackagePolicyHandler',
        name: 'Políticas de Paquetes y Tarifas',
        passed: true,
        message: successMsg,
        details: { paqueteNombre: paquete.nombre, descuento: paquete.descuento_porcentaje },
      });
    } else {
      context.logs.push('[OK] [PricingAndPackagePolicyHandler] Reserva sin paquete turístico (tarifa estándar por noche). Políticas comerciales OK.');
    }

    context.logs.push('[EXITO] [CADENA COMPLETADA] La solicitud superó los 4 eslabones de validación. Habilitada para ensamblado con Composite y Builder.');

    return await super.handle(context);
  }
}

export default PricingAndPackagePolicyHandler;
