/**
 * ============================================================================
 * IMPLEMENTACIÓN 100% PROCEDIMENTAL Y ACOPLADA (SIN PATRONES DE DISEÑO)
 * ============================================================================
 * 
 * Este módulo representa el enfoque monolítico tradicional "Línea Base".
 * TODO el flujo ocurre dentro de un único método largo y rígido:
 * 
 *  1. Validaciones anidadas con múltiples 'if / else' (fechas, capacidad, mantenimiento, cruces).
 *  2. Bucles 'for' tradicionales para acumular subtotales de servicios y descuentos manuales.
 *  3. Inserción de reserva sin Builder ni abstracción de construcción.
 *  4. Ejecución DIRECTA Y ACOPLADA (HARDCODED) de 4 acciones post-reserva:
 *     - Generar link WhatsApp universal
 *     - Actualizar estado de habitación en catálogo
 *     - Escribir en log de auditoría
 *     - Notificar a broker / sistema externo
 * 
 * ⚠️ PROBLEMAS DE INGENIERÍA DE SOFTWARE DEMOSTRADOS:
 *  - VIOLACIÓN DE SINGLE RESPONSIBILITY PRINCIPLE (SRP):
 *    Un solo método tiene al menos 6 razones para cambiar (reglas de fecha,
 *    políticas de paquetes, lógica de precios, formato WhatsApp, auditoría, notificación).
 *  - VIOLACIÓN DE OPEN/CLOSED PRINCIPLE (OCP):
 *    Para agregar una nueva validación o un nuevo canal de notificación (SMS, email),
 *    es obligatorio modificar y poner en riesgo este método existente.
 *  - ALTO ACOPLAMIENTO Y NULA TESTABILIDAD INDEPENDIENTE.
 * ============================================================================
 */

export async function procesarReservaProcedural(datosReserva, deps = {}) {
  const logsEjecucion = [];
  const appendLog = (msg) => {
    logsEjecucion.push(msg);
  };

  appendLog('▶ [INICIO PROCEDIMENTAL] Iniciando procesamiento de reserva en método monolítico...');

  // --------------------------------------------------------------------------
  // PASO 1: VALIDACIONES ANIDADAS MEDIANTE CONDICIONALES 'if / else'
  // (Sin Chain of Responsibility: toda la complejidad ciclomática está aquí)
  // --------------------------------------------------------------------------

  // 1.1 Validación de cliente/usuario
  if (!datosReserva.cliente_id && !datosReserva.usuario_id) {
    appendLog('❌ [ERROR PROCEDIMENTAL] Falla validación: Titular requerido.');
    throw new Error('Validación fallida: El cliente o usuario titular es requerido.');
  }

  // 1.2 Validación de fechas con condicionales anidados
  if (!datosReserva.fecha_inicio || !datosReserva.fecha_fin) {
    appendLog('❌ [ERROR PROCEDIMENTAL] Falla validación: Fechas requeridas.');
    throw new Error('Validación fallida: Las fechas de inicio y fin son obligatorias.');
  } else {
    const inicio = new Date(datosReserva.fecha_inicio);
    const fin = new Date(datosReserva.fecha_fin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      appendLog('❌ [ERROR PROCEDIMENTAL] Falla validación: Formato de fechas no válido.');
      throw new Error('Validación fallida: Formato de fecha inválido.');
    } else {
      if (inicio >= fin) {
        appendLog(`❌ [ERROR PROCEDIMENTAL] Falla validación: inicio (${datosReserva.fecha_inicio}) >= fin (${datosReserva.fecha_fin}).`);
        throw new Error('Validación fallida: La fecha de inicio debe ser estrictamente anterior a la fecha de fin.');
      } else {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const inicioNormalizado = new Date(inicio);
        inicioNormalizado.setHours(0, 0, 0, 0);

        if (inicioNormalizado < hoy) {
          appendLog('❌ [ERROR PROCEDIMENTAL] Falla validación: Fecha de inicio en el pasado.');
          throw new Error('Validación fallida: La fecha de inicio no puede ser anterior al día de hoy.');
        } else {
          appendLog(`✔ [VALIDACIÓN FECHAS OK] Rango coherente: ${datosReserva.fecha_inicio} a ${datosReserva.fecha_fin}`);
        }
      }
    }
  }

  // 1.3 Validación de habitación y capacidad
  let habitacion = null;
  if (!datosReserva.habitacion_id) {
    appendLog('❌ [ERROR PROCEDIMENTAL] Falla validación: Habitación requerida.');
    throw new Error('Validación fallida: La habitación es requerida.');
  } else {
    // Consulta simulada o provista por dependencias
    if (deps.obtenerHabitacion) {
      habitacion = await deps.obtenerHabitacion(datosReserva.habitacion_id);
    } else {
      // Mock por defecto para pruebas
      habitacion = {
        id: datosReserva.habitacion_id,
        numero: '101',
        tipo: 'SENCILLA',
        capacidad: 2,
        precio_noche: 150000,
        estado: 'DISPONIBLE',
      };
    }

    if (!habitacion) {
      appendLog('❌ [ERROR PROCEDIMENTAL] Falla validación: Habitación no encontrada.');
      throw new Error('Validación fallida: La habitación solicitada no existe.');
    } else {
      if (habitacion.estado === 'MANTENIMIENTO') {
        appendLog(`❌ [ERROR PROCEDIMENTAL] Falla validación: Habitación #${habitacion.numero} en MANTENIMIENTO.`);
        throw new Error('Validación fallida: La habitación se encuentra en mantenimiento.');
      } else {
        const totalPersonas = 1 + (datosReserva.acompanantes ? datosReserva.acompanantes.length : 0);
        if (totalPersonas > (habitacion.capacidad || 2)) {
          appendLog(`❌ [ERROR PROCEDIMENTAL] Falla validación: Capacidad excedida (${totalPersonas} personas > máx ${habitacion.capacidad}).`);
          throw new Error(`Validación fallida: La cantidad de personas (${totalPersonas}) supera la capacidad máxima (${habitacion.capacidad}) de la habitación.`);
        } else {
          appendLog(`✔ [VALIDACIÓN HABITACIÓN Y CAPACIDAD OK] Habitación #${habitacion.numero} operativa, capacidad ${totalPersonas}/${habitacion.capacidad}.`);
        }
      }
    }
  }

  // 1.4 Validación de cruce de fechas (disponibilidad) mediante bucle tradicional
  const reservasExistentes = deps.reservasExistentes || [];
  const reqInicio = new Date(datosReserva.fecha_inicio);
  const reqFin = new Date(datosReserva.fecha_fin);

  for (let i = 0; i < reservasExistentes.length; i++) {
    const r = reservasExistentes[i];
    if (r.habitacion_id === datosReserva.habitacion_id && r.estado !== 'CANCELADA') {
      const exInicio = new Date(r.fecha_inicio);
      const exFin = new Date(r.fecha_fin);
      if (reqInicio < exFin && reqFin > exInicio) {
        appendLog(`❌ [ERROR PROCEDIMENTAL] Cruce detectado con reserva #${r.id} (${r.fecha_inicio} al ${r.fecha_fin}).`);
        throw new Error(`Validación fallida: La habitación ya cuenta con una reserva activa en este período.`);
      }
    }
  }
  appendLog('✔ [VALIDACIÓN DISPONIBILIDAD OK] No existen reservas solapadas en calendario.');

  // --------------------------------------------------------------------------
  // PASO 2: CÁLCULO DE PRECIO Y POLÍTICAS DE PAQUETE CON BUCLES 'for'
  // (Sin Patrón Composite: cálculo manual de descuentos y árboles de costo)
  // --------------------------------------------------------------------------
  const diffMs = reqFin.getTime() - reqInicio.getTime();
  const noches = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const subtotalHabitacion = noches * parseFloat(habitacion.precio_noche);
  let totalPaquete = 0;

  if (datosReserva.paquete_id) {
    let paquete = null;
    if (deps.obtenerPaquete) {
      paquete = await deps.obtenerPaquete(datosReserva.paquete_id);
    } else {
      // Mock representativo con servicios
      paquete = {
        id: datosReserva.paquete_id,
        nombre: 'Paquete Ecoturístico',
        descuento_porcentaje: 15,
        noches_minimas: 2,
        servicios: [
          { nombre: 'Desayuno Buffet', precio: 25000, cantidad: 2 },
          { nombre: 'Paseo Ecológico Guiado', precio: 50000, cantidad: 1 },
        ],
      };
    }

    if (!paquete) {
      appendLog('❌ [ERROR PROCEDIMENTAL] Paquete seleccionado no existe.');
      throw new Error('Validación fallida: El paquete turístico seleccionado no existe.');
    }

    if (noches < (paquete.noches_minimas || 1)) {
      appendLog(`❌ [ERROR PROCEDIMENTAL] Noches mínimas no cumplidas: ${noches} < ${paquete.noches_minimas}`);
      throw new Error(`Validación fallida: El paquete '${paquete.nombre}' requiere un mínimo de ${paquete.noches_minimas} noches.`);
    }

    // Bucle 'for' imperativo para calcular subtotales de servicios
    let subtotalServicios = 0;
    if (paquete.servicios && Array.isArray(paquete.servicios)) {
      for (let s = 0; s < paquete.servicios.length; s++) {
        const serv = paquete.servicios[s];
        const cant = serv.cantidad || 1;
        subtotalServicios += parseFloat(serv.precio) * cant;
      }
    }

    const descPorc = parseFloat(paquete.descuento_porcentaje) || 0;
    const descuentoAplicado = subtotalServicios * (descPorc / 100);
    totalPaquete = subtotalServicios - descuentoAplicado;
    appendLog(`✔ [CÁLCULO PAQUETE] Subtotal servicios: $${subtotalServicios} | Descuento (${descPorc}%): -$${descuentoAplicado} | Total paquete: $${totalPaquete}`);
  }

  const precioTotalFinal = Number((subtotalHabitacion + totalPaquete).toFixed(2));
  appendLog(`✔ [PRECIO TOTAL CALCULADO] Hospedaje (${noches} noches x $${habitacion.precio_noche}): $${subtotalHabitacion} + Paquete: $${totalPaquete} = TOTAL: $${precioTotalFinal}`);

  // --------------------------------------------------------------------------
  // PASO 3: CREACIÓN DE LA RESERVA (Estructura directa, sin Builder)
  // --------------------------------------------------------------------------
  const reservaGenerada = {
    id: datosReserva.id || `PROC-${Date.now().toString().slice(-6)}`,
    cliente_id: datosReserva.cliente_id || datosReserva.usuario_id,
    cliente_nombre: datosReserva.cliente_nombre || 'Juan Pérez',
    cliente_telefono: datosReserva.cliente_telefono || '3001234567',
    habitacion_id: habitacion.id,
    habitacion_numero: habitacion.numero,
    fecha_inicio: datosReserva.fecha_inicio,
    fecha_fin: datosReserva.fecha_fin,
    noches,
    precio_total: precioTotalFinal,
    estado: datosReserva.estado || 'CONFIRMADA',
    metodo_pago: datosReserva.metodo_pago || 'EFECTIVO',
    creado_en: new Date().toISOString(),
  };

  appendLog(`✔ [RESERVA CREADA EN MEMORIA] ID #${reservaGenerada.id} registrada exitosamente.`);

  // --------------------------------------------------------------------------
  // PASO 4: LAS 4 ACCIONES POST-RESERVA ACOPLADAS DE FORMA DIRECTA (HARDCODED)
  // (Sin Patrón Observer: si alguna de estas falla o cambia, rompe todo el flujo)
  // --------------------------------------------------------------------------

  // Acción 4.1: Generación rígida y hardcoded de Link de WhatsApp
  const numeroRecepcion = '573183389453';
  const textoMensaje = `¡Hola! Reserva #${reservaGenerada.id} confirmada para ${reservaGenerada.cliente_nombre} en Habitación ${reservaGenerada.habitacion_numero}. Fechas: ${reservaGenerada.fecha_inicio} a ${reservaGenerada.fecha_fin}. Total: $${reservaGenerada.precio_total}`;
  const whatsappUrl = `https://wa.me/${numeroRecepcion}?text=${encodeURIComponent(textoMensaje)}`;
  appendLog(`📱 [ACCIÓN 1 - WHATSAPP HARDCODED] Link generado directamente: ${whatsappUrl}`);

  // Acción 4.2: Actualización directa del estado de la habitación
  habitacion.estado = 'OCUPADA';
  if (deps.actualizarHabitacion) {
    await deps.actualizarHabitacion(habitacion.id, { estado: 'OCUPADA' });
  }
  appendLog(`🏨 [ACCIÓN 2 - HABITACIÓN DIRECTA] Estado de Habitación #${habitacion.numero} forzado rígidamente a 'OCUPADA'.`);

  // Acción 4.3: Registro directo de auditoría
  const logAuditoria = `[AUDIT_PROCEDURAL] ${new Date().toISOString()} | ACTION=RESERVA_CREADA | ID=${reservaGenerada.id} | USER=${reservaGenerada.cliente_id} | AMOUNT=$${reservaGenerada.precio_total}`;
  if (deps.guardarAuditoria) {
    deps.guardarAuditoria(logAuditoria);
  }
  appendLog(`🛡️ [ACCIÓN 3 - AUDITORÍA DIRECTA] Bitácora escrita directamente en archivo/memoria: "${logAuditoria}"`);

  // Acción 4.4: Notificación acoplada directa
  const payloadNotificacion = {
    evento: 'RESERVA_CREADA',
    reserva_id: reservaGenerada.id,
    timestamp: Date.now(),
    canal: 'SISTEMA_MONOLITICO_PROCEDIMENTAL',
  };
  if (deps.notificarExterno) {
    deps.notificarExterno(payloadNotificacion);
  }
  appendLog(`📡 [ACCIÓN 4 - NOTIFICACIÓN DIRECTA] Notificación despachada rígidamente a broker/webhook sin bus de eventos.`);

  appendLog('🏁 [FIN PROCEDIMENTAL] Flujo completado con alto acoplamiento.');

  return {
    success: true,
    reserva: reservaGenerada,
    whatsappUrl,
    habitacionActualizada: habitacion,
    logAuditoria,
    payloadNotificacion,
    logsEjecucion,
    analisisPatrones: {
      singleResponsibilityViolation: 'Una sola función maneja validaciones, parseo de fechas, cálculo de tarifas, mutación de habitación, construcción de URL WhatsApp, I/O de auditoría y red de notificación.',
      openClosedViolation: 'Para cambiar el proveedor de mensajes o agregar reglas de negocio, se debe reescribir esta función completa.',
    },
  };
}
export default procesarReservaProcedural;
