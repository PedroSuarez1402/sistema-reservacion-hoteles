import BaseHandler from './BaseHandler.js';

/**
 * ESLABN 2: RoomStatusAndCapacityHandler
 * Responsabilidad nica: Validar el estado operativo del recurso habitacional y su aforo.
 * Corta la cadena si la habitacin est en mantenimiento o si la cantidad de huspedes excede la capacidad.
 */
export class RoomStatusAndCapacityHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const habitacion_id = context.habitacion_id || context.habitacionId;
    const { catalogoHabitaciones, roomRepository } = context;

    if (!habitacion_id) {
      const errorMsg = 'El identificador de habitacin es obligatorio.';
      context.logs.push(`? [RoomStatusAndCapacityHandler] Corte de cadena: ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitacin y Aforo',
        passed: false,
        message: errorMsg,
      });
      return {
        success: false,
        handler: 'RoomStatusAndCapacityHandler',
        error: errorMsg,
        context,
      };
    }

    // Resolver la habitacin desde el repositorio, catlogo o mock
    let room = null;
    if (roomRepository && typeof roomRepository.getById === 'function') {
      try {
        room = await roomRepository.getById(habitacion_id);
      } catch (_) {
        room = null;
      }
    } else if (catalogoHabitaciones && catalogoHabitaciones instanceof Map) {
      room = catalogoHabitaciones.get(habitacion_id);
    } else if (catalogoHabitaciones && typeof catalogoHabitaciones === 'object') {
      room = catalogoHabitaciones[habitacion_id];
    } else if (context.habitacion) {
      room = context.habitacion;
    } else {
      // Mock predeterminado o inferido de los datos del request
      room = {
        id: habitacion_id,
        numero: context.habitacion_numero || context.habitacionNumero || '101',
        tipo: 'SENCILLA',
        capacidad: context.capacidadMaximaHabitacion || 3,
        precio_noche: context.precioNoche || 150000,
        estado: context.estadoHabitacion || 'DISPONIBLE',
      };
    }

    if (!room) {
      const errorMsg = `Habitacin inexistente: La habitacin con ID '${habitacion_id}' no se encuentra en el catlogo.`;
      context.logs.push(`? [RoomStatusAndCapacityHandler] Corte de cadena: ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitacin y Aforo',
        passed: false,
        message: errorMsg,
      });
      return {
        success: false,
        handler: 'RoomStatusAndCapacityHandler',
        error: errorMsg,
        context,
      };
    }

    // Validacin de estado de mantenimiento
    const estadoHab = context.estadoHabitacion || room.estado;
    if (estadoHab === 'MANTENIMIENTO' || estadoHab === 'FUERA_DE_SERVICIO' || estadoHab === 'BLOQUEADA') {
      const errorMsg = `Recurso no disponible: La habitacin #${room.numero} se encuentra en estado '${estadoHab}' y no puede recibir reservas.`;
      context.logs.push(`? [RoomStatusAndCapacityHandler] Corte de cadena: ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitacin y Aforo',
        passed: false,
        message: errorMsg,
        details: { habitacion: room.numero, estado: estadoHab },
      });
      return {
        success: false,
        handler: 'RoomStatusAndCapacityHandler',
        error: errorMsg,
        context,
      };
    }

    // Validacin de aforo / capacidad mxima
    const numAcompanantes = Array.isArray(context.acompanantes) ? context.acompanantes.length : 0;
    const totalHuespedes = context.numHuespedes ? Number(context.numHuespedes) : (1 + numAcompanantes);
    const capacidadMaxima = Number(context.capacidadMaximaHabitacion || room.capacidad) || 2;

    if (totalHuespedes > capacidadMaxima) {
      const errorMsg = `Aforo excedido: Se solicit alojamiento para ${totalHuespedes} personas, pero la capacidad mxima de la habitacin #${room.numero} es de ${capacidadMaxima} persona(s).`;
      context.logs.push(`? [RoomStatusAndCapacityHandler] Corte de cadena: ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitacin y Aforo',
        passed: false,
        message: errorMsg,
        details: { totalHuespedes, capacidadMaxima, habitacion: room.numero },
      });
      return {
        success: false,
        handler: 'RoomStatusAndCapacityHandler',
        error: errorMsg,
        context,
      };
    }

    // Enriquecer el contexto
    context.habitacion = room;
    context.totalHuespedes = totalHuespedes;
    context.capacidadMaxima = capacidadMaxima;

    const passMsg = `Habitacin #${room.numero} operativa y aforo verificado (${totalHuespedes}/${capacidadMaxima} personas).`;
    context.logs.push(`? [RoomStatusAndCapacityHandler] ${passMsg} Cadena contina.`);
    context.trace.push({
      step: 'RoomStatusAndCapacityHandler',
      name: 'Estado de Habitacin y Aforo',
      passed: true,
      message: passMsg,
      details: { habitacion: room.numero, estado: estadoHab, totalHuespedes, capacidadMaxima },
    });

    return await super.handle(context);
  }
}

export default RoomStatusAndCapacityHandler;
