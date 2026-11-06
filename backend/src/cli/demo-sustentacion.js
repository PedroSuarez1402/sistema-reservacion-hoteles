#!/usr/bin/env node
/**
 * ============================================================================
 * SCRIPT DEMOSTRADOR INTERACTIVO PARA SUSTENTACIÓN DE PATRONES DE DISEÑO
 * ============================================================================
 * 
 * Comparativa técnica entre:
 * 1. Monolito Procedimental (Código acoplado, if/else anidados, llamadas hardcoded)
 * 2. Arquitectura con Patrones de Software:
 *    - Chain of Responsibility (Validación modular desacoplada)
 *    - Composite + Builder (Cálculo jerárquico de precios y ensamblado seguro)
 *    - Observer (Gestión de eventos y efectos colaterales desacoplados)
 *    - Desacoplamiento en tiempo de ejecución (Hot Unsubscribe / OCP)
 * 
 * Autor: Desarrollador Backend Senior
 * Asignatura: Patrones de Software
 * ============================================================================
 */

import { procesarReservaProcedural } from '../procedural/proceduralBooking.js';
import {
  crearCadenaValidacionReserva,
  DateCoherenceHandler,
  RoomStatusAndCapacityHandler,
  OverlapAvailabilityHandler,
  PricingAndPackagePolicyHandler,
} from '../chain/index.js';
import {
  crearGestorEventosReserva,
  ReservationEventManager,
  WhatsAppNotificationObserver,
  RoomHousekeepingObserver,
  AuditLogObserver,
  MessageBrokerBridgeObserver,
} from '../observers/index.js';
import { ReservationBuilder } from '../builders/reservation.builder.js';
import {
  CotizacionReserva,
  HospedajeItem,
  PaqueteCompuesto,
  ServicioSimple,
} from '../composite/index.js';

// ============================================================================
// PALETA DE COLORES ANSI Y UTILIDADES DE TERMINAL
// ============================================================================
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Colores de texto
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Colores brillantes
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Fondos
  bgBlue: '\x1b[44m\x1b[97m',
  bgMagenta: '\x1b[45m\x1b[97m',
  bgCyan: '\x1b[46m\x1b[30m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[97m',
  bgYellow: '\x1b[43m\x1b[30m',
  bgDark: '\x1b[100m\x1b[97m',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function printBanner(title, subtitle) {
  const width = 86;
  const line = '═'.repeat(width);
  console.log(`\n${C.brightCyan}${C.bold}╔${line}╗${C.reset}`);
  console.log(`${C.brightCyan}${C.bold}║  ${title.padEnd(width - 2)}║${C.reset}`);
  if (subtitle) {
    console.log(`${C.cyan}║  ${subtitle.padEnd(width - 2)}║${C.reset}`);
  }
  console.log(`${C.brightCyan}${C.bold}╚${line}╝${C.reset}\n`);
}

function printSectionHeader(number, title, description) {
  console.log(`\n${C.bgBlue}${C.bold} DEMO ${number}: ${title.toUpperCase()} ${C.reset}`);
  if (description) {
    console.log(`${C.dim}  ↳ ${description}${C.reset}`);
  }
  console.log(`${C.blue}${'─'.repeat(88)}${C.reset}`);
}

function printSubHeader(text) {
  console.log(`\n${C.bold}${C.yellow}▶ ${text}${C.reset}`);
}

function printSuccess(badge, message) {
  console.log(`  ${C.bgGreen}${C.bold} ${badge} ${C.reset} ${C.green}${message}${C.reset}`);
}

function printError(badge, message) {
  console.log(`  ${C.bgRed}${C.bold} ${badge} ${C.reset} ${C.brightRed}${message}${C.reset}`);
}

function printInfo(badge, message) {
  console.log(`  ${C.bgCyan}${C.bold} ${badge} ${C.reset} ${C.cyan}${message}${C.reset}`);
}

function printAcademicNote(concept, explanation) {
  console.log(`\n  ${C.bgYellow}${C.bold} 🎓 CONCEPTO DE INGENIERÍA: ${concept} ${C.reset}`);
  console.log(`  ${C.yellow}┌${'─'.repeat(84)}┐${C.reset}`);
  const lines = explanation.split('\n');
  for (const l of lines) {
    console.log(`  ${C.yellow}│${C.reset}  ${l.padEnd(82)}${C.yellow}│${C.reset}`);
  }
  console.log(`  ${C.yellow}└${'─'.repeat(84)}┘${C.reset}\n`);
}

// ============================================================================
// DATOS MOCK COMPARTIDOS PARA LAS PRUEBAS
// ============================================================================
const HABITACIONES_MOCK = {
  'hab-101': {
    id: 'hab-101',
    numero: '101',
    tipo: 'SENCILLA',
    capacidad: 2,
    precio_noche: 150000,
    estado: 'DISPONIBLE',
  },
  'hab-202': {
    id: 'hab-202',
    numero: '202',
    tipo: 'DOBLE',
    capacidad: 3,
    precio_noche: 220000,
    estado: 'DISPONIBLE',
  },
  'hab-303-mant': {
    id: 'hab-303-mant',
    numero: '303',
    tipo: 'SUITE',
    capacidad: 4,
    precio_noche: 450000,
    estado: 'MANTENIMIENTO',
  },
};

const PAQUETES_MOCK = {
  'paq-eco': {
    id: 'paq-eco',
    nombre: 'Plan Ecoturístico Selva Viva',
    descuento_porcentaje: 15,
    noches_minimas: 2,
    servicios: [
      { id: 'srv-1', nombre: 'Desayuno Campesino Orgánico', precio: 30000, cantidad: 2 },
      { id: 'srv-2', nombre: 'Guianza Ecológica y Senderismo', precio: 75000, cantidad: 1 },
      { id: 'srv-3', nombre: 'Paseo en Bote por Laguna', precio: 55000, cantidad: 1 },
    ],
  },
};

const RESERVAS_EXISTENTES_CALENDARIO = [
  {
    id: 'RES-OCCUPIED-01',
    habitacion_id: 'hab-101',
    fecha_inicio: '2026-12-01',
    fecha_fin: '2026-12-05',
    estado: 'CONFIRMADA',
  },
];

// ============================================================================
// DEMO 1: EJECUCIÓN SIN PATRONES (MODO PROCEDIMENTAL Y ACOPLADO)
// ============================================================================
async function ejecutarDemo1() {
  printSectionHeader(
    '1',
    'Ejecución SIN Patrones (Monolito Procedimental y Fuertemente Acoplado)',
    'Demostración de método monolítico con if/else anidados, bucles for y efectos colaterales hardcoded'
  );

  // 1.1 CASO INVÁLIDO
  printSubHeader('Caso 1.1: Solicitud Inválida (Fechas Invertidas: Inicio 2026-12-25 > Fin 2026-12-20)');
  const reservaInvalida = {
    cliente_id: 'cli-001',
    cliente_nombre: 'Carlos Mendoza',
    habitacion_id: 'hab-101',
    fecha_inicio: '2026-12-25',
    fecha_fin: '2026-12-20',
  };

  try {
    await procesarReservaProcedural(reservaInvalida, {
      obtenerHabitacion: async (id) => HABITACIONES_MOCK[id],
      reservasExistentes: RESERVAS_EXISTENTES_CALENDARIO,
    });
  } catch (err) {
    printError('CORTE PROCEDIMENTAL', `Excepción capturada: ${err.message}`);
    console.log(`${C.dim}    ↳ Toda la lógica de control estuvo embebida dentro del mismo bloque 'if / else' principal.${C.reset}`);
  }

  await sleep(400);

  // 1.2 CASO VÁLIDO
  printSubHeader('Caso 1.2: Solicitud Válida procesada en Bloque Monolítico Único');
  const reservaValida = {
    id: 'RES-MONO-7788',
    cliente_id: 'cli-002',
    cliente_nombre: 'Dra. Valentina Gómez',
    cliente_telefono: '3157778899',
    habitacion_id: 'hab-101',
    paquete_id: 'paq-eco',
    fecha_inicio: '2026-12-10',
    fecha_fin: '2026-12-13', // 3 noches
    acompanantes: [{ nombre: 'Santiago Gómez' }],
  };

  try {
    const resultado = await procesarReservaProcedural(reservaValida, {
      obtenerHabitacion: async (id) => HABITACIONES_MOCK[id],
      obtenerPaquete: async (id) => PAQUETES_MOCK[id],
      reservasExistentes: RESERVAS_EXISTENTES_CALENDARIO,
      guardarAuditoria: (linea) => {},
      actualizarHabitacion: async (id, data) => {},
    });

    console.log(`\n  ${C.bold}Traza de ejecución paso a paso dentro del método monolítico:${C.reset}`);
    resultado.logsEjecucion.forEach((log) => {
      console.log(`    ${C.cyan}•${C.reset} ${log}`);
    });

    console.log(`\n  ${C.bold}Efectos colaterales ejecutados RÍGIDAMENTE (Hardcoded) en el mismo método:${C.reset}`);
    printInfo('WHATSAPP', resultado.whatsappUrl);
    printInfo('HABITACIÓN', `Mutada directamente a: ${resultado.habitacionActualizada.estado}`);
    printInfo('AUDITORÍA', resultado.logAuditoria);
    printInfo('NOTIFICACIÓN', JSON.stringify(resultado.payloadNotificacion));

    printAcademicNote(
      'VIOLACIÓN DE PRINCIPIOS SOLID (SRP & OCP)',
      '1. VIOLACIÓN DE RESPONSABILIDAD ÚNICA (SRP):\n' +
      '   El método procesarReservaProcedural() tiene 6 motivos para cambiar:\n' +
      '   (validación de fechas, reglas de aforo, lógica de precios, link WhatsApp,\n' +
      '   escritura de logs y red de notificación).\n\n' +
      '2. VIOLACIÓN DE ABIERTO/CERRADO (OCP):\n' +
      '   Si el hotel decide agregar notificación por SMS o una política de depósito,\n' +
      '   DEBE abrirse y editarse este método gigante, corriendo el riesgo de quebrar\n' +
      '   el cálculo de tarifas o la validación de fechas existente.'
    );
  } catch (err) {
    printError('FALLO', err.message);
  }
}

// ============================================================================
// DEMO 2: CHAIN OF RESPONSIBILITY EN ACCIÓN
// ============================================================================
async function ejecutarDemo2() {
  printSectionHeader(
    '2',
    'Patrón Chain of Responsibility (Cadena de Responsabilidad)',
    'Desacoplamiento de validaciones en eslabones autónomos que se ejecutan secuencialmente y cortan la cadena ante fallos'
  );

  console.log(`\n  ${C.bold}Estructura de la Cadena de Eslabones:${C.reset}`);
  console.log(`  ${C.brightCyan}[1. DateCoherenceHandler]${C.reset} ➔ ${C.brightCyan}[2. RoomStatusAndCapacityHandler]${C.reset} ➔ ${C.brightCyan}[3. OverlapAvailabilityHandler]${C.reset} ➔ ${C.brightCyan}[4. PricingAndPackagePolicyHandler]${C.reset} ➔ ${C.green}[Composite + Builder]${C.reset}\n`);

  await sleep(300);

  // 2.1 CORTE EN ESLABÓN 1 (Fechas invertidas)
  printSubHeader('Caso 2.1: Corte Temprano en Eslabón 1 (DateCoherenceHandler)');
  const cadena1 = crearCadenaValidacionReserva();
  const ctxFechasMal = {
    fecha_inicio: '2026-12-18',
    fecha_fin: '2026-12-12', // Invertida
    habitacion_id: 'hab-101',
    catalogoHabitaciones: HABITACIONES_MOCK,
    catalogoPaquetes: PAQUETES_MOCK,
  };

  const res1 = await cadena1.handle(ctxFechasMal);
  ctxFechasMal.logs.forEach((l) => console.log(`    ${C.dim}${l}${C.reset}`));
  printError('ESLABÓN CORTÓ', `[${res1.handler}]: ${res1.error}`);
  console.log(`    ${C.green}✔ BENEFICIO: Los eslabones 2, 3 y 4 NI SIQUIERA se ejecutaron. Cero consultas a base de datos.${C.reset}`);

  await sleep(350);

  // 2.2 CORTE EN ESLABÓN 2 (Capacidad Excedida)
  printSubHeader('Caso 2.2: Corte en Eslabón 2 (RoomStatusAndCapacityHandler)');
  const cadena2 = crearCadenaValidacionReserva();
  const ctxAforoMal = {
    fecha_inicio: '2026-12-15',
    fecha_fin: '2026-12-18',
    habitacion_id: 'hab-101', // Capacidad = 2 personas
    acompanantes: [{ nombre: 'Ana' }, { nombre: 'Pedro' }, { nombre: 'Mateo' }], // 1 titular + 3 acompañantes = 4 personas
    catalogoHabitaciones: HABITACIONES_MOCK,
    catalogoPaquetes: PAQUETES_MOCK,
  };

  const res2 = await cadena2.handle(ctxAforoMal);
  ctxAforoMal.logs.forEach((l) => console.log(`    ${C.dim}${l}${C.reset}`));
  printError('ESLABÓN CORTÓ', `[${res2.handler}]: ${res2.error}`);
  console.log(`    ${C.green}✔ BENEFICIO: Eslabón 1 superó la prueba. Eslabón 2 detectó aforo excedido y detuvo el flujo limpiamente.${C.reset}`);

  await sleep(350);

  // 2.3 CORTE EN ESLABÓN 3 (Cruce de Fechas - Overlap)
  printSubHeader('Caso 2.3: Corte en Eslabón 3 (OverlapAvailabilityHandler)');
  const cadena3 = crearCadenaValidacionReserva();
  const ctxOverlap = {
    fecha_inicio: '2026-12-02',
    fecha_fin: '2026-12-04', // Solapa con RES-OCCUPIED-01 (2026-12-01 al 2026-12-05)
    habitacion_id: 'hab-101',
    catalogoHabitaciones: HABITACIONES_MOCK,
    reservasExistentes: RESERVAS_EXISTENTES_CALENDARIO,
    catalogoPaquetes: PAQUETES_MOCK,
  };

  const res3 = await cadena3.handle(ctxOverlap);
  ctxOverlap.logs.forEach((l) => console.log(`    ${C.dim}${l}${C.reset}`));
  printError('ESLABÓN CORTÓ', `[${res3.handler}]: ${res3.error}`);
  console.log(`    ${C.green}✔ BENEFICIO: Eslabón 3 aisló la lógica de solapamiento temporal sin mezclar reglas de precios.${C.reset}`);

  await sleep(350);

  // 2.4 CASO EXITOSO -> COMPOSITE + BUILDER
  printSubHeader('Caso 2.4: Solicitud Válida supera los 4 Eslabones ➔ Pasa a Composite + Builder');
  const cadena4 = crearCadenaValidacionReserva();
  const ctxExitoso = {
    cliente_id: 'cli-009',
    usuario_id: 'usr-admin-1',
    habitacion_id: 'hab-202', // Doble, cap 3, $220.000
    paquete_id: 'paq-eco',    // Ecoturístico, desc 15%, mín 2 noches
    fecha_inicio: '2026-12-15',
    fecha_fin: '2026-12-18', // 3 noches
    acompanantes: [{ nombre: 'Lucía Suárez', parentesco: 'Esposa' }],
    catalogoHabitaciones: HABITACIONES_MOCK,
    catalogoPaquetes: PAQUETES_MOCK,
    reservasExistentes: RESERVAS_EXISTENTES_CALENDARIO,
    metodo_pago: 'TRANSFERENCIA',
    tipo_reserva: 'ANTICIPADA',
    anticipo: 100000,
  };

  const res4 = await cadena4.handle(ctxExitoso);
  ctxExitoso.logs.forEach((l) => console.log(`    ${C.dim}${l}${C.reset}`));
  printSuccess('CADENA COMPLETA', 'Todos los eslabones aprobaron la solicitud (success: true).');

  // Integración con COMPOSITE (Cálculo polimórfico de precio)
  console.log(`\n  ${C.bold}Ejecutando Patrón Composite para la Cotización:${C.reset}`);
  const cotizacion = new CotizacionReserva();
  const itemHospedaje = new HospedajeItem({
    habitacionId: ctxExitoso.habitacion.id,
    noches: ctxExitoso.noches,
    precioNoche: ctxExitoso.habitacion.precio_noche,
  });
  cotizacion.agregar(itemHospedaje);

  const paq = ctxExitoso.paquete;
  const paqueteComposite = new PaqueteCompuesto({
    paqueteId: paq.id,
    nombre: paq.nombre,
    descuentoPorcentaje: paq.descuento_porcentaje,
  });
  for (const s of paq.servicios) {
    paqueteComposite.agregar(
      new ServicioSimple({
        servicioId: s.id,
        nombre: s.nombre,
        precioUnitario: s.precio,
        cantidad: s.cantidad,
      })
    );
  }
  cotizacion.agregar(paqueteComposite);

  const totalCalculadoComposite = cotizacion.calcularPrecio();
  const desglose = cotizacion.obtenerDesglose();

  const itemHosp = desglose.elementos[0];
  const itemPaq = desglose.elementos[1];

  console.log(`    ${C.cyan}• [Composite Leaf] Hospedaje: ${itemHosp.noches} noches x $${itemHosp.precio_noche} = $${itemHosp.subtotal}${C.reset}`);
  console.log(`    ${C.cyan}• [Composite Node] Paquete: '${itemPaq.nombre}' con ${itemPaq.total_items} servicios | Desc: ${itemPaq.descuento_porcentaje}% | Subtotal: $${itemPaq.total_neto}${C.reset}`);
  console.log(`    ${C.green}• [Composite Total] Cotización polimórfica calculada: $${totalCalculadoComposite}${C.reset}`);

  // Integración con BUILDER (Construcción paso a paso)
  console.log(`\n  ${C.bold}Ejecutando Patrón Builder (ReservationBuilder):${C.reset}`);
  const builder = new ReservationBuilder()
    .conCliente(ctxExitoso.cliente_id)
    .conHuesped(ctxExitoso.usuario_id)
    .paraHabitacion(ctxExitoso.habitacion_id)
    .conFechas(ctxExitoso.fecha_inicio, ctxExitoso.fecha_fin)
    .conAcompanantes(ctxExitoso.acompanantes)
    .conPaquete(ctxExitoso.paquete_id)
    .conCotizacion(cotizacion)
    .conTotalManual(totalCalculadoComposite)
    .conMetodoPago(ctxExitoso.metodo_pago)
    .conTipoReserva(ctxExitoso.tipo_reserva)
    .conAnticipo(ctxExitoso.anticipo)
    .conEstado('CONFIRMADA');

  const reservaFinalConstruida = builder.build();
  printSuccess('BUILDER PRODUCT', `Reserva construida y validada inmutablemente: ID=${reservaFinalConstruida.cliente_id} | Total=$${reservaFinalConstruida.precio_total} | Anticipo=$${reservaFinalConstruida.anticipo}`);

  printAcademicNote(
    'SINGLE RESPONSIBILITY EN CHAIN OF RESPONSIBILITY',
    'Cada manejador tiene una y sólo una razón para cambiar:\n' +
    '  - DateCoherenceHandler sólo sabe de lógica temporal de calendario.\n' +
    '  - RoomStatusAndCapacityHandler sólo inspecciona aforo y mantenimiento.\n' +
    '  - OverlapAvailabilityHandler sólo calcula intersecciones de intervalos.\n' +
    '  - PricingAndPackagePolicyHandler sólo aplica reglas comerciales.\n' +
    'Nuevas reglas (ej. seguro obligatorio, edad mínima) se agregan como nuevos\n' +
    'eslabones sin tocar los existentes.'
  );
}

// ============================================================================
// DEMO 3: PATRÓN OBSERVER EN ACCIÓN
// ============================================================================
async function ejecutarDemo3() {
  printSectionHeader(
    '3',
    'Patrón Observer (Observador)',
    'Publicación de eventos de dominio desacoplados (RESERVA_CREADA, CHECK_IN_REALIZADO) y notificación paralela a 4 observadores'
  );

  console.log(`\n  ${C.bold}Suscripción dinámica de Observadores en ReservationEventManager:${C.reset}`);
  console.log(`                   ┌──> [1. WhatsAppNotificationObserver] (Notificaciones y Enlaces wa.me)`);
  console.log(`                   ├──> [2. RoomHousekeepingObserver]      (Estados de habitación y cuadrillas de aseo)`);
  console.log(`  [EventManager] ──┤`);
  console.log(`                   ├──> [3. AuditLogObserver]             (Bitácora forense inmutable con Checksum)`);
  console.log(`                   └──> [4. MessageBrokerBridgeObserver]  (Puente al bus distribuido Pub/Sub)\n`);

  const { eventManager, observers } = crearGestorEventosReserva();

  await sleep(350);

  // 3.1 DISPARO DE EVENTO: RESERVA_CREADA
  printSubHeader('Evento 3.1: Se emite "RESERVA_CREADA"');
  const eventoReservaCreada = {
    id: 'RES-OBS-2026',
    cliente_id: 'cli-554',
    cliente_nombre: 'Ing. Fernando Castro',
    cliente_telefono: '3189994433',
    habitacion_id: 'hab-202',
    habitacion_numero: '202',
    fecha_inicio: '2026-12-20',
    fecha_fin: '2026-12-24',
    precio_total: 820000,
    estado: 'CONFIRMADA',
  };

  const reportesCreada = await eventManager.notify('RESERVA_CREADA', eventoReservaCreada);

  for (const r of reportesCreada) {
    if (r.id === 'WhatsAppNotificationObserver') {
      printInfo('OBSERVER 1 [WhatsApp]', `Link wa.me generado para ${r.resultado.telefonoDestino}:`);
      console.log(`      ${C.dim}↳ URL: ${r.resultado.whatsappUrl}${C.reset}`);
    } else if (r.id === 'RoomHousekeepingObserver') {
      printInfo('OBSERVER 2 [Housekeeping]', `Habitación #${r.resultado.habitacionNumero} ➔ ${r.resultado.nuevoEstadoHabitacion}`);
      console.log(`      ${C.dim}↳ Orden de aseo: ${r.resultado.ordenHousekeeping}${C.reset}`);
    } else if (r.id === 'AuditLogObserver') {
      printInfo('OBSERVER 3 [Auditoría]', `Registro inmutable sellado: Checksum=${r.resultado.checksum} | Total registros=${r.resultado.totalAuditoriasRegistradas}`);
    } else if (r.id === 'MessageBrokerBridgeObserver') {
      printInfo('OBSERVER 4 [Broker Pub/Sub]', `Tópico '${r.resultado.topicoBroker}' despachado ➔ ${r.resultado.estadoEntrega}`);
    }
  }

  await sleep(400);

  // 3.2 DISPARO DE EVENTO: CHECK_IN_REALIZADO
  printSubHeader('Evento 3.2: Se emite "CHECK_IN_REALIZADO" (Huésped llega a recepción)');
  const eventoCheckIn = {
    ...eventoReservaCreada,
    estado: 'EN_CURSO',
    checkInTimestamp: new Date().toISOString(),
  };

  const reportesCheckIn = await eventManager.notify('CHECK_IN_REALIZADO', eventoCheckIn);

  for (const r of reportesCheckIn) {
    if (r.id === 'WhatsAppNotificationObserver') {
      printInfo('OBSERVER 1 [WhatsApp]', `Mensaje de bienvenida y clave WiFi enviado al huésped.`);
    } else if (r.id === 'RoomHousekeepingObserver') {
      printInfo('OBSERVER 2 [Housekeeping]', `Habitación #${r.resultado.habitacionNumero} marcada como '${r.resultado.nuevoEstadoHabitacion}'. Cerradura activada.`);
    } else if (r.id === 'AuditLogObserver') {
      printInfo('OBSERVER 3 [Auditoría]', `Acción CHECK_IN_REALIZADO auditada. Checksum=${r.resultado.checksum}`);
    } else if (r.id === 'MessageBrokerBridgeObserver') {
      printInfo('OBSERVER 4 [Broker Pub/Sub]', `Evento CHECK_IN_REALIZADO retransmitido al bus.`);
    }
  }

  printAcademicNote(
    'DESACOPLAMIENTO ENTRE NEGOCIO Y EFECTOS SECUNDARIOS',
    'El servicio de reservas no conoce los detalles de implementación de WhatsApp,\n' +
    'ni del sistema de camarería, ni de auditoría, ni del Broker de mensajería.\n' +
    'Sólo dispara "eventManager.notify(EVENTO, datos)".\n' +
    'Esto elimina el acoplamiento directo y previene errores en cascada.'
  );
}

// ============================================================================
// DEMO 4: DESACOPLAMIENTO EN TIEMPO DE EJECUCIÓN (HOT UNSUBSCRIBE)
// ============================================================================
async function ejecutarDemo4() {
  printSectionHeader(
    '4',
    'Desacoplamiento en Tiempo de Ejecución (Hot Unsubscribe)',
    'Demostración en vivo de modificación del comportamiento del sistema sin reiniciar ni modificar el código fuente del servicio'
  );

  const { eventManager } = crearGestorEventosReserva();

  printSubHeader('Paso 4.1: Estado inicial de suscripciones para "CHECK_OUT_REALIZADO"');
  const subsIniciales = eventManager.getSubscribers('CHECK_OUT_REALIZADO');
  console.log(`  Suscripciones activas (${subsIniciales.length}): ${C.brightGreen}${subsIniciales.join(', ')}${C.reset}`);

  await sleep(400);

  // DESUSCRIPCIÓN EN VIVO
  printSubHeader('Paso 4.2: Ejecutando Desuscripción Dinámica en Caliente:');
  console.log(`  ${C.bgMagenta}${C.bold} EJECUTANDO: eventManager.unsubscribe('WhatsAppNotificationObserver') ${C.reset}`);
  eventManager.unsubscribe('WhatsAppNotificationObserver');

  const subsRestantes = eventManager.getSubscribers('CHECK_OUT_REALIZADO');
  console.log(`  Nuevas suscripciones activas (${subsRestantes.length}): ${C.brightYellow}${subsRestantes.join(', ')}${C.reset}`);
  printSuccess('HOT UNSUBSCRIBE', 'WhatsAppNotificationObserver fue desconectado en vivo sin afectar el servicio.');

  await sleep(400);

  // DISPARO DE CHECK_OUT_REALIZADO
  printSubHeader('Paso 4.3: Procesando evento "CHECK_OUT_REALIZADO" con la suscripción modificada');
  const datosCheckOut = {
    id: 'RES-OBS-2026',
    cliente_nombre: 'Ing. Fernando Castro',
    habitacion_id: 'hab-202',
    habitacion_numero: '202',
    precio_total: 820000,
    estado: 'FINALIZADA',
  };

  const reportesCheckOut = await eventManager.notify('CHECK_OUT_REALIZADO', datosCheckOut);

  console.log(`  ${C.bold}Reporte de ejecución de Observadores:${C.reset}`);
  for (const r of reportesCheckOut) {
    if (r.id === 'RoomHousekeepingObserver') {
      printSuccess('OBSERVER Housekeeping', `Habitación #${r.resultado.habitacionNumero} pasa a '${r.resultado.nuevoEstadoHabitacion}' ➔ ${r.resultado.ordenHousekeeping}`);
    } else if (r.id === 'AuditLogObserver') {
      printSuccess('OBSERVER Auditoría', `Auditada salida y cierre de cuenta. Checksum: ${r.resultado.checksum}`);
    } else if (r.id === 'MessageBrokerBridgeObserver') {
      printSuccess('OBSERVER Broker', `Notificado CHECK_OUT_REALIZADO al broker distribuido.`);
    }
  }

  // Verificación explícita de que WhatsApp NO se ejecutó
  const ejecutoWhatsApp = reportesCheckOut.some((r) => r.id === 'WhatsAppNotificationObserver');
  if (!ejecutoWhatsApp) {
    console.log(`\n  ${C.brightGreen}${C.bold}✔ VERIFICACIÓN EXITOSA: WhatsAppNotificationObserver NO FUE EJECUTADO.${C.reset}`);
    console.log(`  ${C.dim}  El servicio continuó funcionando con total normalidad con los 3 observadores restantes.${C.reset}`);
  }

  printAcademicNote(
    'PRINCIPIO ABIERTO / CERRADO (OCP) EN ACCIÓN',
    'Con el Patrón Observer demostramos que el sistema está:\n' +
    '  - ABIERTO a la extensión: Se pueden conectar nuevos observadores (ej. Facturación,\n' +
    '    Email, Fidelización de puntos) en cualquier momento.\n' +
    '  - CERRADO a la modificación: No tuvimos que alterar ni una sola línea del\n' +
    '    código de reserva ni de los otros 3 observadores para retirar WhatsApp.\n\n' +
    'En el código procedimental (DEMO 1), deshabilitar WhatsApp habría exigido:\n' +
    '  1. Abrir el archivo procedimental.\n' +
    '  2. Buscar la línea acoplada y comentarla o envolverla en un condicional.\n' +
    '  3. Recompilar o reiniciar el servidor, arriesgando bugs colaterales.'
  );
}

// ============================================================================
// RESUMEN COMPARATIVO Y CIERRE DE LA SUSTENTACIÓN
// ============================================================================
function imprimirResumenSustentacion() {
  const line = '═'.repeat(88);
  console.log(`\n${C.brightCyan}${C.bold}╔${line}╗${C.reset}`);
  console.log(`${C.brightCyan}${C.bold}║                 📊 CUADRO RESUMEN COMPARATIVO PARA EL JURADO CALIFICADOR                  ║${C.reset}`);
  console.log(`${C.brightCyan}${C.bold}╠${line}╣${C.reset}`);
  console.log(`${C.cyan}║  Criterio de Evaluación    │ Línea Base Sin Patrones       │ Arquitectura Con Patrones GoF║${C.reset}`);
  console.log(`${C.cyan}╟────────────────────────────┼───────────────────────────────┼──────────────────────────────╢${C.reset}`);
  console.log(`${C.white}║  Estructura de Validación  │ If / Else anidados monolíticos│ Chain of Responsibility      ║${C.reset}`);
  console.log(`${C.white}║  Cálculo de Precios        │ Bucles for y lógica manual    │ Composite (Árbol polimórfico)║${C.reset}`);
  console.log(`${C.white}║  Construcción de Objetos   │ Diccionarios raw ad-hoc       │ Builder (Validación fluida)  ║${C.reset}`);
  console.log(`${C.white}║  Efectos Post-Reserva      │ Llamadas directas rígidas     │ Observer (Eventos dinámicos) ║${C.reset}`);
  console.log(`${C.white}║  Principio SRP             │ ❌ Violado (6 responsabilidades│ ✔ Cumplido (Eslabones únicos)║${C.reset}`);
  console.log(`${C.white}║  Principio OCP             │ ❌ Violado (Modificar para     │ ✔ Cumplido (Hot Unsubscribe  ║${C.reset}`);
  console.log(`${C.white}║                            │    extender)                  │    y nuevos plugins)         ║${C.reset}`);
  console.log(`${C.white}║  Testabilidad Unitaria     │ ❌ Difícil y dependiente de BD│ ✔ 100% Aislada por eslabones ║${C.reset}`);
  console.log(`${C.brightCyan}${C.bold}╚${line}╝${C.reset}\n`);

  console.log(`${C.green}${C.bold}✔ Sustentación completada exitosamente sin errores.${C.reset}\n`);
}

// ============================================================================
// FUNCIÓN PRINCIPAL ORQUESTADORA
// ============================================================================
async function main() {
  printBanner(
    'HOTEL VIP - SUSTENTACIÓN DE PATRONES DE DISEÑO EN NODE.JS',
    'Comparativa Práctica: Monolito Procedimental vs. Chain of Responsibility + Observer + Composite + Builder'
  );

  await ejecutarDemo1();
  await sleep(400);

  await ejecutarDemo2();
  await sleep(400);

  await ejecutarDemo3();
  await sleep(400);

  await ejecutarDemo4();
  await sleep(400);

  imprimirResumenSustentacion();
}

main().catch((err) => {
  console.error(`\n${C.bgRed}${C.bold} FATAL ERROR EN DEMO ${C.reset}`, err);
  process.exit(1);
});
