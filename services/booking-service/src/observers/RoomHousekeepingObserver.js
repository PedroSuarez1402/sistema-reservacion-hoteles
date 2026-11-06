/**
 * OBSERVADOR 2: RoomHousekeepingObserver
 * Responsabilidad: Gestionar el estado operativo y las órdenes de aseo/camarería (Housekeeping).
 * Escucha: RESERVA_CREADA, CHECK_IN_REALIZADO, CHECK_OUT_REALIZADO.
 */

export class RoomHousekeepingObserver {
  constructor(options = {}) {
    this.id = 'RoomHousekeepingObserver';
    this.name = 'RoomHousekeepingObserver';
    this.description = 'Gestión reactiva de housekeeping y estados de habitación';
    this.roomRepository = options.roomRepository || null;
  }

  async update(eventName, data) {
    const habitacionId = data.habitacion_id || data.habitacionId;
    const numero = data.habitacion_numero || (data.habitacion && data.habitacion.numero) || '101';
    let nuevoEstado = null;
    let accionHousekeeping = '';

    switch (eventName) {
      case 'RESERVA_CREADA':
      case 'RESERVA':
        nuevoEstado = 'RESERVADA';
        accionHousekeeping = `Programar preparación previa y dotación de toallas/amenities para la habitación #${numero} (fecha: ${data.fecha_inicio || data.fechaInicio}).`;
        break;

      case 'CHECK_IN_REALIZADO':
      case 'CHECK_IN':
        nuevoEstado = 'OCUPADA';
        accionHousekeeping = `Huésped ingresó. Habitación #${numero} marcada como OCUPADA, cerradura activa y habilitado frigobar.`;
        break;

      case 'CHECK_OUT_REALIZADO':
      case 'CHECK_OUT':
        nuevoEstado = 'LIMPIEZA';
        accionHousekeeping = `ORDEN PRIORITARIA: Habitación #${numero} desalojada. Cuadrilla de camarería enviada para sanitización, cambio de lencería e inventario.`;
        break;

      default:
        nuevoEstado = 'REVISIÓN';
        accionHousekeeping = `Revisión rutinaria de mantenimiento para habitación #${numero} (evento ${eventName}).`;
    }

    if (this.roomRepository && typeof this.roomRepository.updateStatus === 'function') {
      try {
        await this.roomRepository.updateStatus(habitacionId, nuevoEstado);
      } catch (_) {}
    }

    return {
      observer: this.id,
      evento: eventName,
      habitacionNumero: numero,
      nuevoEstadoHabitacion: nuevoEstado,
      ordenHousekeeping: accionHousekeeping,
      accionHousekeeping,
      message: accionHousekeeping,
      timestamp: new Date().toISOString(),
    };
  }
}

export default RoomHousekeepingObserver;
