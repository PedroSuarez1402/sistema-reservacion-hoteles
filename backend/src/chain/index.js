/**
 * ============================================================================
 * PATRN CHAIN OF RESPONSIBILITY (CADENA DE RESPONSABILIDAD)
 * ============================================================================
 * Desacopla la lgica de validacin de reservas en eslabones independientes
 * con una nica responsabilidad (SRP):
 * 
 * 1. DateCoherenceHandler: Coherencia temporal y fechas en el pasado
 * 2. RoomStatusAndCapacityHandler: Mantenimiento y capacidad de aforo
 * 3. OverlapAvailabilityHandler: Cruce de fechas en calendario
 * 4. PricingAndPackagePolicyHandler: Polticas comerciales y paquetes tursticos
 */

import BaseHandler from './BaseHandler.js';
import DateCoherenceHandler from './DateCoherenceHandler.js';
import RoomStatusAndCapacityHandler from './RoomStatusAndCapacityHandler.js';
import OverlapAvailabilityHandler from './OverlapAvailabilityHandler.js';
import PricingAndPackagePolicyHandler from './PricingAndPackagePolicyHandler.js';

// Alias formal segn terminologa de rbrica y arquitectura
export const ReservationValidationHandler = BaseHandler;

export {
  BaseHandler,
  DateCoherenceHandler,
  RoomStatusAndCapacityHandler,
  OverlapAvailabilityHandler,
  PricingAndPackagePolicyHandler,
};

/**
 * Fabrica y ensambla la cadena de validacin cannica en el orden correcto.
 * @returns {BaseHandler} La cabeza de la cadena (DateCoherenceHandler).
 */
export function crearCadenaValidacionReserva() {
  const dateHandler = new DateCoherenceHandler();
  const roomHandler = new RoomStatusAndCapacityHandler();
  const overlapHandler = new OverlapAvailabilityHandler();
  const pricingHandler = new PricingAndPackagePolicyHandler();

  // Ensamblado fluido de los eslabones:
  // DateCoherenceHandler -> RoomStatusAndCapacityHandler -> OverlapAvailabilityHandler -> PricingAndPackagePolicyHandler
  dateHandler
    .setNext(roomHandler)
    .setNext(overlapHandler)
    .setNext(pricingHandler);

  return dateHandler;
}

export const buildValidationChain = crearCadenaValidacionReserva;

export default crearCadenaValidacionReserva;
