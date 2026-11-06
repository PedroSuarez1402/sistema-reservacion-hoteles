import { ReservationValidationHandler } from './ReservationValidationHandler.js';

/**
 * Eslabn 4: Validacin de Polticas de Cliente, Pagos y Garanta
 * Verifica el estado del cliente (no vetado, cuenta activa) y las
 * condiciones de garanta/anticipo segn el mtodo de pago.
 */
export class ClientPolicyValidationHandler extends ReservationValidationHandler {
  async validate(request, context) {
    const stepName = 'ClientPolicyValidationHandler (Polticas de Cliente y Pago)';
    const { cliente, clienteEstado, metodoPago, anticipo = 0, precioEstimado = 0 } = request;

    // Verificar si el cliente est bloqueado o en lista negra
    if (clienteEstado === 'BLOQUEADO' || clienteEstado === 'VETADO' || cliente?.estado === 'BLOQUEADO') {
      return {
        step: stepName,
        passed: false,
        message: 'El cliente presenta un bloqueo de seguridad en el sistema y no puede registrar reservas.',
        details: { clienteEstado: clienteEstado || cliente?.estado },
      };
    }

    // Verificar mtodo de pago vlido
    const metodosValidos = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'DATAFONO'];
    if (metodoPago && !metodosValidos.includes(String(metodoPago).toUpperCase())) {
      return {
        step: stepName,
        passed: false,
        message: `Mtodo de pago invlido '${metodoPago}'. Permitidos: ${metodosValidos.join(', ')}.`,
        details: { metodoPago, metodosValidos },
      };
    }

    // Si el precio estimado es alto (> $500.000 COP) y es temporada alta o reserva anticipada, verificar anticipo mnimo opcional
    const total = Number(precioEstimado || 0);
    const ant = Number(anticipo || 0);
    if (request.requiereAnticipo && total > 0 && ant < total * 0.2) {
      return {
        step: stepName,
        passed: false,
        message: `La poltica de temporada exige al menos el 20% de anticipo ($${(total * 0.2).toLocaleString()}). Anticipo actual: $${ant.toLocaleString()}.`,
        details: { total, anticipo: ant, minimoExigido: total * 0.2 },
      };
    }

    return {
      step: stepName,
      passed: true,
      message: `Cliente habilitado y poltica comercial aprobada (${metodoPago || 'EFECTIVO'}, anticipo: $${ant.toLocaleString()}).`,
      details: {
        clienteNombre: cliente?.nombre || request.clienteNombre || 'Cliente Registrado',
        metodoPago: metodoPago || 'EFECTIVO',
        anticipo: ant,
      },
    };
  }
}
