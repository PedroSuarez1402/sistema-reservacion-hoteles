/**
 * ============================================================================
 * IMPLEMENTACIÓN PROCEDIMENTAL Y ACOPLADA (MONOLITO - PUERTO 4000)
 * ============================================================================
 * 
 * Espejo de comparación en el monolito que demuestra el flujo completo sin patrones:
 * - Validaciones if/else anidadas
 * - Bucles for para servicios y descuentos
 * - 4 Acciones post-reserva rígidamente acopladas (WhatsApp, Habitación, Auditoría, Notificación)
 */

export async function procesarReservaProcedural(datosReserva, deps = {}) {
  const logsEjecucion = [];
  const appendLog = (msg) => logsEjecucion.push(msg);

  appendLog('▶ [MONOLITO PROCEDIMENTAL :4000] Iniciando procesamiento de reserva monolítica...');

  // 1. Validaciones con if / else anidados
  if (!datosReserva.usuario_id && !datosReserva.cliente_id) {
    appendLog('❌ [MONOLITO ERROR] Falla: usuario_id requerido.');
    throw new Error('Validación fallida: El usuario titular es requerido.');
  }

  if (!datosReserva.fecha_inicio || !datosReserva.fecha_fin) {
    appendLog('❌ [MONOLITO ERROR] Falla: Fechas requeridas.');
    throw new Error('Validación fallida: Las fechas de inicio y fin son requeridas.');
  } else {
    const inicio = new Date(datosReserva.fecha_inicio);
    const fin = new Date(datosReserva.fecha_fin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      appendLog('❌ [MONOLITO ERROR] Falla: Fechas inválidas.');
      throw new Error('Validación fallida: Formato de fecha inválido.');
    } else {
      if (inicio >= fin) {
        appendLog(`❌ [MONOLITO ERROR] Falla: inicio >= fin (${datosReserva.fecha_inicio} vs ${datosReserva.fecha_fin}).`);
        throw new Error('Validación fallida: La fecha de inicio debe ser anterior a la fecha de fin.');
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const normInicio = new Date(inicio);
        normInicio.setHours(0, 0, 0, 0);

        if (normInicio < today) {
          appendLog('❌ [MONOLITO ERROR] Falla: Fecha en el pasado.');
          throw new Error('Validación fallida: La fecha de inicio no puede ser anterior al día actual.');
        } else {
          appendLog(`✔ [MONOLITO FECHAS OK] Fechas válidas: ${datosReserva.fecha_inicio} a ${datosReserva.fecha_fin}`);
        }
      }
    }
  }

  // 1.2 Habitación y capacidad
  let habitacion = null;
  if (!datosReserva.habitacion_id) {
    appendLog('❌ [MONOLITO ERROR] Falla: habitacion_id requerido.');
    throw new Error('Validación fallida: La habitación es requerida.');
  } else {
    if (deps.obtenerHabitacion) {
      habitacion = await deps.obtenerHabitacion(datosReserva.habitacion_id);
    } else {
      habitacion = {
        id: datosReserva.habitacion_id,
        numero: '201',
        tipo: 'DOBLE',
        capacidad: 3,
        precio_noche: 180000,
        estado: 'DISPONIBLE',
      };
    }

    if (!habitacion) {
      appendLog('❌ [MONOLITO ERROR] Falla: Habitación no existe.');
      throw new Error('Validación fallida: La habitación no existe.');
    } else {
      if (habitacion.estado === 'MANTENIMIENTO') {
        appendLog(`❌ [MONOLITO ERROR] Falla: Habitación #${habitacion.numero} en MANTENIMIENTO.`);
        throw new Error('Validación fallida: La habitación está en mantenimiento.');
      } else {
        const totalPax = 1 + (datosReserva.acompanantes ? datosReserva.acompanantes.length : 0);
        if (totalPax > habitacion.capacidad) {
          appendLog(`❌ [MONOLITO ERROR] Falla: Capacidad excedida (${totalPax} > ${habitacion.capacidad}).`);
          throw new Error(`Validación fallida: Capacidad de habitación excedida (${totalPax}/${habitacion.capacidad}).`);
        } else {
          appendLog(`✔ [MONOLITO HABITACIÓN OK] #${habitacion.numero} disponible.`);
        }
      }
    }
  }

  // 1.3 Cruce de fechas
  const reservasExistentes = deps.reservasExistentes || [];
  const reqIni = new Date(datosReserva.fecha_inicio);
  const reqFin = new Date(datosReserva.fecha_fin);

  for (let i = 0; i < reservasExistentes.length; i++) {
    const rx = reservasExistentes[i];
    if (rx.habitacion_id === datosReserva.habitacion_id && rx.estado !== 'CANCELADA') {
      const exI = new Date(rx.fecha_inicio);
      const exF = new Date(rx.fecha_fin);
      if (reqIni < exF && reqFin > exI) {
        appendLog(`❌ [MONOLITO ERROR] Cruce de fechas con reserva existente #${rx.id}`);
        throw new Error('Validación fallida: La habitación no está disponible en este período.');
      }
    }
  }
  appendLog('✔ [MONOLITO DISPONIBILIDAD OK] Sin cruce de fechas.');

  // 2. Cálculo con bucles for tradicionales
  const diff = reqFin.getTime() - reqIni.getTime();
  const noches = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  const subtotalHab = noches * parseFloat(habitacion.precio_noche);
  let totalPaquete = 0;

  if (datosReserva.paquete_id) {
    let paquete = null;
    if (deps.obtenerPaquete) {
      paquete = await deps.obtenerPaquete(datosReserva.paquete_id);
    } else {
      paquete = {
        id: datosReserva.paquete_id,
        nombre: 'Paquete Relax Monolito',
        descuento_porcentaje: 10,
        noches_minimas: 1,
        servicios: [
          { nombre: 'Spa Termal', precio: 60000, cantidad: 1 },
          { nombre: 'Cena Gourmet', precio: 45000, cantidad: 1 },
        ],
      };
    }

    if (!paquete) {
      appendLog('❌ [MONOLITO ERROR] Paquete no existe.');
      throw new Error('Validación fallida: El paquete seleccionado no existe.');
    }

    let subtotalServ = 0;
    if (paquete.servicios && paquete.servicios.length > 0) {
      for (let s = 0; s < paquete.servicios.length; s++) {
        const srv = paquete.servicios[s];
        const cant = srv.cantidad || 1;
        subtotalServ += parseFloat(srv.precio) * cant;
      }
    }

    const desc = parseFloat(paquete.descuento_porcentaje) || 0;
    totalPaquete = subtotalServ * (1 - desc / 100);
    appendLog(`✔ [MONOLITO PAQUETE] Servicios: $${subtotalServ} - Desc ${desc}% = $${totalPaquete}`);
  }

  const precioTotal = Number((subtotalHab + totalPaquete).toFixed(2));
  appendLog(`✔ [MONOLITO PRECIO] Habitación: $${subtotalHab} + Paquete: $${totalPaquete} = TOTAL: $${precioTotal}`);

  // 3. Objeto Reserva Directo
  const reservaId = datosReserva.id || `MONO-${Date.now().toString().slice(-6)}`;
  const nuevaReserva = {
    id: reservaId,
    usuario_id: datosReserva.usuario_id || datosReserva.cliente_id,
    habitacion_id: habitacion.id,
    paquete_id: datosReserva.paquete_id || null,
    fecha_inicio: datosReserva.fecha_inicio,
    fecha_fin: datosReserva.fecha_fin,
    precio_total: precioTotal,
    estado: datosReserva.estado || 'CONFIRMADA',
  };

  // 4. Las 4 Acciones post-reserva directamente acopladas en el método
  // 4.1 WhatsApp
  const phone = '573183389453';
  const msg = `Reserva Monolito #${reservaId} confirmada. Total: $${precioTotal}`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  appendLog(`📱 [MONOLITO POST-1] WhatsApp URL generado rígidamente: ${whatsappUrl}`);

  // 4.2 Actualizar Habitación
  habitacion.estado = 'OCUPADA';
  appendLog(`🏨 [MONOLITO POST-2] Habitación #${habitacion.numero} forzada a OCUPADA.`);

  // 4.3 Log Auditoría
  const auditEntry = `[MONOLITH_AUDIT] ${new Date().toISOString()} | RESERVA=${reservaId} | USER=${nuevaReserva.usuario_id} | AMOUNT=$${precioTotal}`;
  appendLog(`🛡️ [MONOLITO POST-3] Auditoría escrita: ${auditEntry}`);

  // 4.4 Notificación
  appendLog(`📡 [MONOLITO POST-4] Notificación directa enviada.`);

  return {
    success: true,
    reserva: nuevaReserva,
    whatsappUrl,
    auditEntry,
    logsEjecucion,
  };
}

export default procesarReservaProcedural;
