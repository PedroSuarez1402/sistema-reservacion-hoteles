import BaseHandler from './BaseHandler.js';

/**
 * ESLABÓN 2: RoomStatusAndCapacityHandler
 * Responsabilidad Única: Validar el estado operativo del recurso habitacional y su aforo.
 * Corta la cadena si la habitación está en mantenimiento o si la cantidad de huéspedes excede la capacidad.
 */
export class RoomStatusAndCapacityHandler extends BaseHandler {
  async handle(context) {
    if (!context.logs) context.logs = [];
    if (!context.trace) context.trace = [];

    const { habitacion_id, acompanantes, catalogoHabitaciones, roomRepository } = context;

    if (!habitacion_id) {
      const errorMsg = 'El identificador de habitación es obligatorio.';
      context.logs.push(`[CORTE] [RoomStatusAndCapacityHandler] ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitación y Aforo',
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

    let room = null;
    if (context.habitacion) {
      room = context.habitacion;
    } else if (context.room) {
      room = context.room;
    } else if (catalogoHabitaciones && catalogoHabitaciones instanceof Map) {
      room = catalogoHabitaciones.get(habitacion_id);
    } else if (catalogoHabitaciones && typeof catalogoHabitaciones === 'object') {
      room = catalogoHabitaciones[habitacion_id];
    } else if (roomRepository && typeof roomRepository.getById === 'function') {
      try {
        room = await roomRepository.getById(habitacion_id);
      } catch (_) {
        room = null;
      }
    } else {
      room = {
        id: habitacion_id,
        numero: '101',
        tipo: 'SENCILLA',
        capacidad: 2,
        precio_noche: 150000,
        estado: 'DISPONIBLE',
      };
    }

    if (!room) {
      const errorMsg = `Habitación inexistente: La habitación con ID '${habitacion_id}' no se encuentra en el catálogo.`;
      context.logs.push(`[CORTE] [RoomStatusAndCapacityHandler] ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitación y Aforo',
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

    // Validación de estado de mantenimiento
    if (room.estado === 'MANTENIMIENTO' || room.estado === 'FUERA_DE_SERVICIO') {
      const errorMsg = `Recurso no disponible: La habitación #${room.numero} se encuentra en estado '${room.estado}' y no puede recibir reservas.`;
      context.logs.push(`[CORTE] [RoomStatusAndCapacityHandler] ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitación y Aforo',
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

    // Validación de aforo / capacidad máxima
    const numAcompanantes = Array.isArray(acompanantes) ? acompanantes.length : 0;
    const totalHuespedes = 1 + numAcompanantes; // Titular + acompañantes
    const capacidadMaxima = Number(room.capacidad) || 2;

    if (totalHuespedes > capacidadMaxima) {
      const errorMsg = `Aforo excedido: Se solicitó alojamiento para ${totalHuespedes} personas, pero la capacidad máxima de la habitación #${room.numero} es de ${capacidadMaxima} persona(s).`;
      context.logs.push(`[CORTE] [RoomStatusAndCapacityHandler] ${errorMsg}`);
      context.trace.push({
        step: 'RoomStatusAndCapacityHandler',
        name: 'Estado de Habitación y Aforo',
        passed: false,
        message: errorMsg,
        details: { totalHuespedes, capacidadMaxima },
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
    const successMsg = `Habitación #${room.numero} operativa y aforo verificado (${totalHuespedes}/${capacidadMaxima} personas).`;
    context.logs.push(`[OK] [RoomStatusAndCapacityHandler] ${successMsg} Cadena continúa.`);
    context.trace.push({
      step: 'RoomStatusAndCapacityHandler',
      name: 'Estado de Habitación y Aforo',
      passed: true,
      message: successMsg,
      details: { habitacionNumero: room.numero, capacidadMaxima, totalHuespedes },
    });

    return await super.handle(context);
  }
}

export default RoomStatusAndCapacityHandler;
