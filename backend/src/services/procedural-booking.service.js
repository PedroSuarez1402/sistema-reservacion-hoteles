/**
 * Servicio Procedimental Lnea Base (SIN PATRONES)
 * 
 * Ilustra la arquitectura monolítica tradicional previa a la refactorizacin con
 * Chain of Responsibility y Observer.
 * 
 * PROBLEMAS ARQUITECTNICOS / CODE SMELLS:
 * 1. Mtodo gigante "Dios": Valida, calcula y notifica todo en una sola funcin.
 * 2. Alto acoplamiento: Las notificaciones y reglas de negocio estn "hardcodeadas".
 * 3. Violacin de Open/Closed Principle (OCP): Para aadir un nuevo canal (ej. Telegram o Email)
 *    o una nueva regla de validacin, es obligatorio modificar y recompilar esta funcin.
 * 4. Nula flexibilidad en caliente: No se pueden suscribir o desuscribir observadores en runtime.
 * 5. Alta complejidad ciclomtica (mltiples if/else anidados difciles de testear).
 */

export function procesarReservaProcedimental(request, action = 'RESERVA') {
  const startTime = Date.now();
  const validationTrace = [];
  const notificationTrace = [];

  // ==========================================
  // BLOQUE 1: VALIDACIONES PROCEDIMENTALES (IF/ELSE ANIDADOS)
  // ==========================================
  const { fechaInicio, fechaFin, habitacionNumero, estadoHabitacion, numHuespedes, capacidadMaximaHabitacion, clienteEstado, metodoPago } = request;

  let validacionExitosa = true;
  let motivoFallo = null;

  // Paso 1 procedimental: Fechas
  if (!fechaInicio || !fechaFin) {
    validacionExitosa = false;
    motivoFallo = 'Fechas de entrada y salida obligatorias.';
    validationTrace.push({
      step: 'Validacin Procedimental 1: Fechas',
      passed: false,
      message: motivoFallo,
    });
  } else {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (fin <= inicio) {
      validacionExitosa = false;
      motivoFallo = 'La fecha de salida debe ser posterior a la fecha de entrada.';
      validationTrace.push({
        step: 'Validacin Procedimental 1: Fechas',
        passed: false,
        message: motivoFallo,
      });
    } else {
      validationTrace.push({
        step: 'Validacin Procedimental 1: Fechas',
        passed: true,
        message: 'Fechas validadas correctamente mediante condicional inline.',
      });

      // Paso 2 procedimental: Habitacin
      if (estadoHabitacion === 'MANTENIMIENTO' || estadoHabitacion === 'BLOQUEADA') {
        validacionExitosa = false;
        motivoFallo = `Habitacin ${habitacionNumero} no disponible (${estadoHabitacion}).`;
        validationTrace.push({
          step: 'Validacin Procedimental 2: Habitacin',
          passed: false,
          message: motivoFallo,
        });
      } else {
        validationTrace.push({
          step: 'Validacin Procedimental 2: Habitacin',
          passed: true,
          message: `Habitacin ${habitacionNumero || '101'} disponible (verificado por condicional inline).`,
        });

        // Paso 3 procedimental: Capacidad
        const totalPax = Number(numHuespedes || 1);
        const maxPax = Number(capacidadMaximaHabitacion || 3);
        if (totalPax > maxPax) {
          validacionExitosa = false;
          motivoFallo = `Exceso de huspedes: ${totalPax} supera mximo ${maxPax}.`;
          validationTrace.push({
            step: 'Validacin Procedimental 3: Aforo',
            passed: false,
            message: motivoFallo,
          });
        } else {
          validationTrace.push({
            step: 'Validacin Procedimental 3: Aforo',
            passed: true,
            message: `Aforo permitido (${totalPax}/${maxPax}).`,
          });

          // Paso 4 procedimental: Cliente y Pago
          if (clienteEstado === 'BLOQUEADO' || clienteEstado === 'VETADO') {
            validacionExitosa = false;
            motivoFallo = 'Cliente bloqueado por poltica administrativa.';
            validationTrace.push({
              step: 'Validacin Procedimental 4: Poltica Cliente',
              passed: false,
              message: motivoFallo,
            });
          } else {
            validationTrace.push({
              step: 'Validacin Procedimental 4: Poltica Cliente',
              passed: true,
              message: `Cliente habilitado (${metodoPago || 'EFECTIVO'}).`,
            });
          }
        }
      }
    }
  }

  if (!validacionExitosa) {
    return {
      success: false,
      mode: 'PROCEDURAL (Sin Patrones)',
      action,
      executionTimeMs: Date.now() - startTime,
      validationTrace,
      notificationTrace: [
        {
          observer: 'Procedimiento Monoltico',
          status: 'SKIPPED',
          message: `Notificaciones canceladas debido a que fall la validacin inline: ${motivoFallo}`,
          timestamp: new Date().toISOString(),
        },
      ],
      whatsappUrl: null,
      error: motivoFallo,
    };
  }

  // ==========================================
  // BLOQUE 2: NOTIFICACIONES PROCEDIMENTALES RIGIDAS
  // Aqu no hay Observer. Todo se ejecuta en cascada fija.
  // No se pueden apagar ni prender observadores en caliente.
  // ==========================================
  const now = new Date().toISOString();
  const phone = request.telefono ? `57${String(request.telefono).replace(/\D/g, '')}` : '573183389453';
  const codigo = request.codigoReserva || 'RSV-PROC-001';
  const clienteNombre = request.clienteNombre || 'Husped Procedimental';

  // 1. WhatsApp Hardcoded
  const rawMsg = `[Modo Procedimental] Reserva ${codigo} para ${clienteNombre} procesada.`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(rawMsg)}`;
  notificationTrace.push({
    observer: 'WhatsApp (Llamada Hardcoded)',
    status: 'NOTIFIED',
    message: 'Mensaje de WhatsApp generado directamente dentro del bloque de cdigo.',
    whatsappUrl,
    timestamp: now,
  });

  // 2. Housekeeping Hardcoded
  notificationTrace.push({
    observer: 'Housekeeping (Llamada Directa)',
    status: 'NOTIFIED',
    message: `Alerta generada en log interno para habitacin ${habitacionNumero || '101'}.`,
    timestamp: now,
  });

  // 3. Auditora Hardcoded
  notificationTrace.push({
    observer: 'AuditLog (Llamada Directa)',
    status: 'NOTIFIED',
    message: `Auditora simple escrita en consola: Transaccin ${codigo}.`,
    timestamp: now,
  });

  // 4. Broker Hardcoded (llamada acoplada)
  notificationTrace.push({
    observer: 'MessageBroker (Llamada Directa)',
    status: 'NOTIFIED',
    message: `Llamada acoplada a broker sin abstraccin de observador.`,
    timestamp: now,
  });

  return {
    success: true,
    mode: 'PROCEDURAL (Sin Patrones)',
    action,
    executionTimeMs: Date.now() - startTime,
    validationTrace,
    notificationTrace,
    whatsappUrl,
    reservationSummary: {
      codigoReserva: codigo,
      cliente: clienteNombre,
      habitacion: habitacionNumero || '101',
      total: request.total || 150000,
    },
  };
}
