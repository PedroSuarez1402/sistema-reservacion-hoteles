/**
 * Módulo del Patrón Chain of Responsibility (Cadena de Responsabilidad)
 * Valida secuencialmente cada solicitud de reservación registrando la trazabilidad en `validationTrace`.
 */

import { ReservationValidationHandler } from './ReservationValidationHandler.js';
import { DateCoherenceHandler, parseLocalDate, formatIsoDate } from './DateCoherenceHandler.js';
import { RoomStatusAndCapacityHandler } from './RoomStatusAndCapacityHandler.js';
import { OverlapAvailabilityHandler } from './OverlapAvailabilityHandler.js';
import { PricingAndPackagePolicyHandler } from './PricingAndPackagePolicyHandler.js';

/**
 * Construye y enlaza la cadena de validación completa para creación de reservaciones:
 * 1. DateCoherenceHandler -> 2. RoomStatusAndCapacityHandler -> 3. OverlapAvailabilityHandler -> 4. PricingAndPackagePolicyHandler
 *
 * @returns {DateCoherenceHandler} Primer eslabón de la cadena
 */
export function createReservationValidationChain() {
  const dateHandler = new DateCoherenceHandler();
  const roomHandler = new RoomStatusAndCapacityHandler();
  const overlapHandler = new OverlapAvailabilityHandler();
  const pricingHandler = new PricingAndPackagePolicyHandler();

  dateHandler
    .setNext(roomHandler)
    .setNext(overlapHandler)
    .setNext(pricingHandler);

  return dateHandler;
}

export {
  ReservationValidationHandler,
  DateCoherenceHandler,
  RoomStatusAndCapacityHandler,
  OverlapAvailabilityHandler,
  PricingAndPackagePolicyHandler,
  parseLocalDate,
  formatIsoDate,
};

export default {
  ReservationValidationHandler,
  DateCoherenceHandler,
  RoomStatusAndCapacityHandler,
  OverlapAvailabilityHandler,
  PricingAndPackagePolicyHandler,
  createReservationValidationChain,
};
