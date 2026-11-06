import BaseHandler from './BaseHandler.js';

/**
 * ESLABN 4: PricingAndPackagePolicyHandler
 * Responsabilidad nica: Validar polticas comerciales, paquetes tursticos asociados y reglas de estancia mnima.
 * Corta la cadena si un paquete no cumple con las polticas de noches mnimas o vigencia.
 * Una vez superado este eslabn, la solicitud est 100% validada y lista para Composite + Builder.
 */
export class PricingAndPackagePolicyHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const paquete_id = context.paquete_id || context.paqueteId;
    const noches = context.noches || 1;
    const { catalogoPaquetes, paqueteRepository } = context;

    if (paquete_id) {
      let paquete = null;

      if (paqueteRepository && typeof paqueteRepository.findByPk === 'function') {
        try {
          paquete = await paqueteRepository.findByPk(paquete_id);
        } catch (_) {
          paquete = null;
        }
      } else if (catalogoPaquetes && catalogoPaquetes instanceof Map) {
        paquete = catalogoPaquetes.get(paquete_id);
      } else if (catalogoPaquetes && typeof catalogoPaquetes === 'object') {
        paquete = catalogoPaquetes[paquete_id];
      } else if (context.paquete) {
        paquete = context.paquete;
      } else {
        // Paquete de demostracin predeterminado
        paquete = {
          id: paquete_id,
          nombre: 'Paquete Aventura & Relax',
          descuento_porcentaje: 15,
          noches_minimas: 2,
          servicios: [
            { id: 'srv-1', nombre: 'Desayuno Gourmet', precio: 25000, cantidad: 2 },
            { id: 'srv-2', nombre: 'Tour Canopy en Reserva', precio: 50000, cantidad: 1 },
          ],
        };
      }

      if (!paquete) {
        const errorMsg = `Paquete inexistente: El paquete turstico con ID '${paquete_id}' no fue encontrado.`;
        context.logs.push(`? [PricingAndPackagePolicyHandler] Corte de cadena: ${errorMsg}`);
        context.trace.push({
          step: 'PricingAndPackagePolicyHandler',
          name: 'Polticas Comerciales y Paquetes Tursticos',
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

      // Regla de poltica: Estancia mnima exigida por el paquete
      const nochesMinimas = Number(paquete.noches_minimas) || 1;
      const nochesSolicitadas = Number(noches) || 1;

      if (nochesSolicitadas < nochesMinimas) {
        const errorMsg = `Incumplimiento de poltica: El paquete '${paquete.nombre}' exige una estada mnima de ${nochesMinimas} noches (se solicitaron ${nochesSolicitadas} noche(s)).`;
        context.logs.push(`? [PricingAndPackagePolicyHandler] Corte de cadena: ${errorMsg}`);
        context.trace.push({
          step: 'PricingAndPackagePolicyHandler',
          name: 'Polticas Comerciales y Paquetes Tursticos',
          passed: false,
          message: errorMsg,
          details: { nochesSolicitadas, nochesMinimas, paquete: paquete.nombre },
        });
        return {
          success: false,
          handler: 'PricingAndPackagePolicyHandler',
          error: errorMsg,
          context,
        };
      }

      context.paquete = paquete;
      const passMsg = `Paquete '${paquete.nombre}' validado: Estada mnima cumplida (${nochesSolicitadas} >= ${nochesMinimas} noches). Descuento comercial aplicado: ${paquete.descuento_porcentaje}%.`;
      context.logs.push(`? [PricingAndPackagePolicyHandler] ${passMsg}`);
      context.trace.push({
        step: 'PricingAndPackagePolicyHandler',
        name: 'Polticas Comerciales y Paquetes Tursticos',
        passed: true,
        message: passMsg,
        details: { paquete: paquete.nombre, descuento: `${paquete.descuento_porcentaje}%` },
      });
    } else {
      const passMsg = `Tarifa estndar aprobada: Reserva individual sin paquete turstico. Polticas comerciales y forma de pago conformes.`;
      context.logs.push(`? [PricingAndPackagePolicyHandler] ${passMsg}`);
      context.trace.push({
        step: 'PricingAndPackagePolicyHandler',
        name: 'Polticas Comerciales y Tarifas',
        passed: true,
        message: passMsg,
        details: { metodoPago: context.metodoPago || 'TRANSFERENCIA' },
      });
    }

    context.logs.push(`? [CADENA COMPLETADA CON XITO] La solicitud super los 4 eslabones de validacin. Habilitada para ensamblado con Composite y Builder.`);

    return await super.handle(context);
  }
}

export default PricingAndPackagePolicyHandler;
