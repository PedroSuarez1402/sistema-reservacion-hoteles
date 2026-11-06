/**
 * OBSERVADOR 2: RoomHousekeepingObserver
 * Responsabilidad: Gestionar el estado operativo y las rdenes de aseo/camarera (Housekeeping).
 * Escucha: RESERVA_CREADA, CHECK_IN_REALIZADO, CHECK_OUT_REALIZADO (y RESERVA, CHECK_IN, CHECK_OUT).
 */

export class RoomHousekeepingObserver {
  constructor(options = {}) {
    this.id = 'RoomHousekeepingObserver';
    this.roomRepository = options.roomRepository || null;
    this.enabled = true;
  }

  setEnabled(status) {
    this.enabled = Boolean(status);
  }

  isEnabled() {
    return this.enabled;
  }

  async update(eventName, data) {
    const habitacionId = data.habitacion_id || data.habitacionId || 'hab-101';
    const numero = data.habitacion_numero || data.habitacionNumero || (data.habitacion && data.habitacion.numero) || '101';
    let nuevoEstado = null;
    let accionHousekeeping = '';

    switch (eventName) {
      case 'RESERVA_CREADA':
      case 'RESERVA':
        nuevoEstado = 'RESERVADA';
        accionHousekeeping = `Programar preparacin previa y dotacin de toallas/amenities para la habitacin #${numero} (fecha: ${data.fecha_inicio || data.fechaInicio}).`;
        break;

      case 'CHECK_IN_REALIZADO':
      case 'CHECK_IN':
        nuevoEstado = 'OCUPADA';
        accionHousekeeping = `Husped ingres. Habitacin #${numero} marcada como OCUPADA, cerradura activa y habilitado frigobar.`;
        break;

      case 'CHECK_OUT_REALIZADO':
      case 'CHECK_OUT':
        nuevoEstado = 'LIMPIEZA';
        accionHousekeeping = `ORDEN PRIORITARIA: Habitacin #${numero} desalojada. Cuadrilla de camarera enviada para sanitizacin, cambio de lencera e inventario.`;
        break;

      default:
        nuevoEstado = 'REVISIN';
        accionHousekeeping = `Revisin rutinaria de mantenimiento para habitacin #${numero} (evento ${eventName}).`;
    }

    if (this.roomRepository && typeof this.roomRepository.updateStatus === 'function') {
      try {
        await this.roomRepository.updateStatus(habitacionId, nuevoEstado);
      } catch (_) {
        // En demostracin sin BD, opera de manera resiliente
      }
    }

    return {
      observer: this.id,
      evento: eventName,
      habitacionNumero: numero,
      nuevoEstadoHabitacion: nuevoEstado,
      message: accionHousekeeping,
      accionHousekeeping,
      timestamp: new Date().toISOString(),
    };
  }
}

export default RoomHousekeepingObserver;
