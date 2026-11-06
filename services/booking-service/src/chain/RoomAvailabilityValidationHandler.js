import { ReservationValidationHandler } from './ReservationValidationHandler.js';

/**
 * Eslabn 2: Validacin de Disponibilidad y Estado de la Habitacin
 * Verifica que la habitacin est habilitada, exista en inventario y no
 * presente solapamiento con reservas previas aprobadas.
 */
export class RoomAvailabilityValidationHandler extends ReservationValidationHandler {
  async validate(request, context) {
    const stepName = 'RoomAvailabilityValidationHandler (Disponibilidad y Estado)';
    const { habitacionId, habitacionNumero, estadoHabitacion, solapamientosDetectados } = request;

    if (!habitacionId && !habitacionNumero) {
      return {
        step: stepName,
        passed: false,
        message: 'Identificador de habitacin no especificado.',
        details: { habitacionId, habitacionNumero },
      };
    }

    // Si la simulacin o el request indica mantenimiento o fuera de servicio
    if (estadoHabitacion === 'MANTENIMIENTO' || estadoHabitacion === 'BLOQUEADA') {
      return {
        step: stepName,
        passed: false,
        message: `La habitacin ${habitacionNumero || habitacionId} est actualmente en estado ${estadoHabitacion} y no puede asignarse.`,
        details: { estadoHabitacion },
      };
    }

    // Verificacin de solapamiento
    if (solapamientosDetectados && solapamientosDetectados.length > 0) {
      return {
        step: stepName,
        passed: false,
        message: `Conflicto de disponibilidad: La habitacin ya cuenta con reservas activas en ese rango.`,
        details: { conflictos: solapamientosDetectados },
      };
    }

    return {
      step: stepName,
      passed: true,
      message: `Habitacin ${habitacionNumero || habitacionId} confirmada como DISPONIBLE sin conflictos de calendario.`,
      details: {
        habitacionId: habitacionId || 'HAB-101',
        habitacionNumero: habitacionNumero || '101',
        estadoActual: estadoHabitacion || 'DISPONIBLE',
      },
    };
  }
}
