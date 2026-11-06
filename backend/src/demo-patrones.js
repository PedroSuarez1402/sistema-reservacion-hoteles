/**
 * Demostracin en Terminal: Chain of Responsibility & Observer
 * Ejecutable mediante: npm run demo:patrones
 * 
 * Compara en tiempo de ejecucin la arquitectura basada en Patrones GoF
 * frente a la lnea base procedimental monoltica.
 */

import { buildValidationChain } from './chain/index.js';
import { defaultEventManager } from './observers/index.js';
import { procesarReservaProcedimental } from './services/procedural-booking.service.js';

// Colores ANSI para terminal
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function banner(title) {
  console.log('\n' + c.cyan + c.bold + '================================================================================' + c.reset);
  console.log(c.bold + '   ' + title + c.reset);
  console.log(c.cyan + c.bold + '================================================================================' + c.reset);
}

function subtitle(text) {
  console.log('\n' + c.yellow + c.bold + '--- ' + text + ' ---' + c.reset);
}

async function runDemo() {
  banner('SISTEMA HOTELERO - LABORATORIO DE PATRONES DE SOFTWARE (TERCER CORTE)');
  console.log(c.dim + 'Patrones a evaluar: Chain of Responsibility (Validacin) & Observer (Eventos de Dominio)' + c.reset);

  const requestValido = {
    codigoReserva: 'RSV-2026-DEMO',
    clienteNombre: 'Carlos Mendoza',
    telefono: '3183389453',
    habitacionId: 'hab-suite-301',
    habitacionNumero: 'Suite 301',
    estadoHabitacion: 'DISPONIBLE',
    fechaInicio: '2026-12-10',
    fechaFin: '2026-12-14',
    numHuespedes: 2,
    capacidadMaximaHabitacion: 4,
    clienteEstado: 'ACTIVO',
    metodoPago: 'TRANSFERENCIA',
    anticipo: 100000,
    total: 720000,
    noches: 4,
    isHistoricalSimulation: true,
  };

  // ==========================================================================
  // ESCENARIO 1: LNEA BASE PROCEDIMENTAL (SIN PATRONES)
  // ==========================================================================
  subtitle('ESCENARIO 1: MODO PROCEDIMENTAL (Lnea Base Monoltica Sin Patrones)');
  console.log(c.dim + 'Ejecutando procesarReservaProcedimental()...' + c.reset);

  const inicioProc = Date.now();
  const resultadoProc = procesarReservaProcedimental(requestValido, 'RESERVA');
  const duracionProc = Date.now() - inicioProc;

  console.log(`\n${c.bold}Resultado:${c.reset} ${resultadoProc.success ? c.green + 'EXITOSA' : c.red + 'FALLIDA'}${c.reset} (Tiempo: ${duracionProc}ms)`);
  console.log(c.bold + 'Trazabilidad de Validaciones Procedimentales:' + c.reset);
  resultadoProc.validationTrace.forEach((step, idx) => {
    console.log(`   [${idx + 1}] ${step.passed ? c.green + 'OK' : c.red + 'FAIL'}${c.reset} ${step.step}: ${step.message}`);
  });

  console.log(c.bold + '\nTrazabilidad de Notificaciones Procedimentales (Hardcoded):' + c.reset);
  resultadoProc.notificationTrace.forEach(notif => {
    console.log(`   -> [${notif.observer}] ${notif.message}`);
  });
  console.log(`   ${c.cyan}WhatsApp Link (Directo):${c.reset} ${resultadoProc.whatsappUrl}`);
  console.log(`\n${c.yellow}Diagnstico Arquitectnico Procedimental:${c.reset}`);
  console.log(`  - ${c.red}Violacin OCP:${c.reset} Imposible aadir un 5 observador o una nueva regla sin alterar la funcin.`);
  console.log(`  - ${c.red}Violacin SRP:${c.reset} Un solo mtodo maneja validaciones, persistencia, formatos y avisos.`);
  console.log(`  - ${c.red}Alto Acoplamiento:${c.reset} No permite desuscribir canales en tiempo de ejecucin.`);

  // ==========================================================================
  // ESCENARIO 2: CON PATRONES (Chain of Responsibility + Observer)
  // ==========================================================================
  subtitle('ESCENARIO 2: CON PATRONES (Chain of Responsibility + Observer)');
  console.log(c.dim + 'Ejecutando Chain de 4 eslabones y despachando a Subject Observer...' + c.reset);

  const inicioPatrones = Date.now();
  const chain = buildValidationChain();
  const context = { ...requestValido, trace: [], logs: [] };

  await chain.handle(context);
  const duracionPatrones = Date.now() - inicioPatrones;

  console.log(`\n${c.bold}Fase A - Chain of Responsibility (Validacin por Eslabones Independientes):${c.reset}`);
  context.trace.forEach((step, idx) => {
    console.log(`   Eslabn ${idx + 1} (${c.cyan}${step.step}${c.reset}): ${step.passed ? c.green + 'APROBADO' : c.red + 'RECHAZADO'}${c.reset}`);
    console.log(`      Detalle: ${step.message}`);
  });

  console.log(`\n${c.bold}Fase B - Observer Pattern (Reaccin Desacoplada de Observadores Suscritos):${c.reset}`);
  const notificationTrace = await defaultEventManager.notify('RESERVA_CREADA', requestValido);

  notificationTrace.forEach(notif => {
    const statusColor = notif.status === 'NOTIFIED' ? c.green : notif.status === 'DISABLED' ? c.yellow : c.red;
    console.log(`   Observador: ${c.bold}${notif.observer}${c.reset} [${statusColor}${notif.status}${c.reset}]`);
    console.log(`      Mensaje: ${notif.message}`);
    if (notif.whatsappUrl) {
      console.log(`      ${c.green}Enlace WhatsApp generado:${c.reset} ${notif.whatsappUrl}`);
    }
  });

  // ==========================================================================
  // ESCENARIO 3: DEMOSTRACIN DE SUSCRIPCIN / DESUSCRIPCIN EN CALIENTE (HOT-SWAP)
  // ==========================================================================
  subtitle('ESCENARIO 3: DESUSCRIPCIN DINMICA EN CALIENTE (Flexibilidad en Runtime)');
  console.log(c.dim + 'Desactivando WhatsAppNotificationObserver y MessageBrokerBridgeObserver...' + c.reset);

  defaultEventManager.setObserverStatus('WhatsAppNotificationObserver', false);
  defaultEventManager.setObserverStatus('MessageBrokerBridgeObserver', false);

  console.log(`\n${c.magenta}Disparando nuevo evento CHECK_IN con observadores modificados en memoria...${c.reset}`);
  const notifTraceDesuscrito = await defaultEventManager.notify('CHECK_IN', {
    ...requestValido,
    clienteNombre: 'Carlos Mendoza',
    habitacionNumero: 'Suite 301',
  });

  notifTraceDesuscrito.forEach(notif => {
    const statusColor = notif.status === 'NOTIFIED' ? c.green : notif.status === 'DISABLED' ? c.yellow : c.red;
    console.log(`   -> [${notif.observer}] Estado: ${statusColor}${notif.status}${c.reset} | ${notif.message}`);
  });

  // Restaurar estados activos
  defaultEventManager.setObserverStatus('WhatsAppNotificationObserver', true);
  defaultEventManager.setObserverStatus('MessageBrokerBridgeObserver', true);

  // ==========================================================================
  // ESCENARIO 4: CORTE DE CADENA ANTE SOLICITUD INVLIDA (Short-Circuit)
  // ==========================================================================
  subtitle('ESCENARIO 4: CORTE DE CADENA ANTE SOLICITUD INVLIDA (Short-Circuit)');
  const requestInvalido = {
    ...requestValido,
    numHuespedes: 8, // Excede aforo mximo de 4
  };

  const contextInvalido = { ...requestInvalido, trace: [], logs: [] };
  const resultadoInvalido = await chain.handle(contextInvalido);

  console.log(`Intentando reservar para 8 personas en habitacin con capacidad 4...`);
  contextInvalido.trace.forEach((step, idx) => {
    const statusColor = step.passed ? c.green : c.red;
    console.log(`   Eslabn ${idx + 1}: [${statusColor}${step.passed ? 'PASS' : 'FAIL'}${c.reset}] ${step.step} -> ${step.message}`);
  });

  console.log(`\n${c.red}${c.bold}Resultado:${c.reset} La cadena interrumpi el flujo de validacin en el eslabn de aforo [${resultadoInvalido.handler}].`);
  console.log(`${c.dim}Proteccin de Integridad: Al fallar la validacin, los observadores NUNCA son notificados.${c.reset}`);

  // ==========================================================================
  // MATRIZ COMPARATIVA FINAL
  // ==========================================================================
  banner('MATRIZ COMPARATIVA DE EVALUACIN TCNICA');
  console.log(`
| Criterio                     | Sin Patrones (Procedimental)    | Con Patrones (Chain + Observer)  |
|------------------------------|---------------------------------|----------------------------------|
| Acoplamiento                 | Alto (Tightly Coupled)          | Bajo (Event Driven / Decoupled)  |
| Open/Closed Principle (OCP)  | Viola (requiere editar fuente)  | Cumple (nuevos handlers/obs)     |
| Single Responsibility (SRP)  | Viola (Mtodo Dios Monoltico)   | Cumple (Eslabn/Observador nico) |
| Suscripcin Dinmica en Vivo  | Imposible                      | Soportada en tiempo de ejecucin |
| Testeabilidad Unitaria       | Compleja (mock masivo)          | Alta (pruebas aisladas x clase)  |
| Complejidad Ciclomtica       | O(N) acumulada en if anidados   | O(1) x clase individual          |
`);

  console.log(c.green + c.bold + 'Demostracin completada con xito.\n' + c.reset);
}

runDemo().catch(err => {
  console.error('Error durante la ejecucin del demo:', err);
});
