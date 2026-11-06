'use client';

import * as React from 'react';
import {
  Workflow,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Radio,
  ExternalLink,
  RefreshCw,
  Terminal,
  Zap,
  Sliders,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import patronesService, {
  ObserverInfo,
  SimulationResult,
  ValidationTraceStep,
  NotificationTraceStep,
} from '@/services/patrones.service';

export default function PatronesDashboardPage() {
  // Estado de Observadores
  const [observers, setObservers] = React.useState<ObserverInfo[]>([]);
  const [isLoadingObservers, setIsLoadingObservers] = React.useState(true);
  const [togglingObserver, setTogglingObserver] = React.useState<string | null>(null);

  // Parámetros de Simulación
  const [mode, setMode] = React.useState<'PATTERNS' | 'PROCEDURAL'>('PATTERNS');
  const [action, setAction] = React.useState<'RESERVA' | 'CHECK_IN' | 'CHECK_OUT'>('RESERVA');
  const [clienteNombre, setClienteNombre] = React.useState('Pedro Suárez');
  const [telefono, setTelefono] = React.useState('3183389453');
  const [habitacionNumero, setHabitacionNumero] = React.useState('Suite 301');
  const [numHuespedes, setNumHuespedes] = React.useState(2);
  const [capacidadMaxima, setCapacidadMaxima] = React.useState(4);
  const [estadoHabitacion, setEstadoHabitacion] = React.useState('DISPONIBLE');
  const [fechaInicio, setFechaInicio] = React.useState('2026-12-10');
  const [fechaFin, setFechaFin] = React.useState('2026-12-14');
  const [total, setTotal] = React.useState(720000);

  // Estado de Ejecución y Trazabilidad
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [simulationResult, setSimulationResult] = React.useState<SimulationResult | null>(null);
  const [copiedCommand, setCopiedCommand] = React.useState(false);

  // Cargar observadores al montar la página
  const loadObservers = React.useCallback(async () => {
    setIsLoadingObservers(true);
    try {
      const data = await patronesService.getObservers();
      setObservers(data);
    } catch (err) {
      console.error('Error cargando observadores:', err);
    } finally {
      setIsLoadingObservers(false);
    }
  }, []);

  React.useEffect(() => {
    loadObservers();
  }, [loadObservers]);

  // Alternar suscripción de observador en tiempo real
  const handleToggleObserver = async (name: string, currentEnabled: boolean) => {
    setTogglingObserver(name);
    try {
      const updated = await patronesService.toggleObserver(name, !currentEnabled);
      setObservers((prev) =>
        prev.map((o) => (o.name === name || o.id === name ? { ...o, enabled: updated.enabled } : o))
      );
    } catch (err) {
      console.error('Error cambiando estado del observador:', err);
    } finally {
      setTogglingObserver(null);
    }
  };

  // Suscribir o desuscribir todos
  const handleToggleAll = async (targetState: boolean) => {
    for (const obs of observers) {
      if (obs.enabled !== targetState) {
        await patronesService.toggleObserver(obs.name, targetState);
      }
    }
    await loadObservers();
  };

  // Disparar simulación
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const result = await patronesService.runSimulation({
        mode,
        action,
        payload: {
          codigoReserva: `RSV-${Date.now().toString().slice(-4)}`,
          clienteNombre,
          telefono,
          habitacionNumero,
          numHuespedes,
          capacidadMaximaHabitacion: capacidadMaxima,
          estadoHabitacion,
          fechaInicio,
          fechaFin,
          total,
          noches: 4,
        },
      });
      setSimulationResult(result);
    } catch (err) {
      console.error('Error durante la simulación:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Presets de demostración rápida
  const applyPreset = (preset: 'SUCCESS' | 'CAPACITY_FAIL' | 'MAINTENANCE_FAIL' | 'CHECKIN' | 'CHECKOUT') => {
    switch (preset) {
      case 'SUCCESS':
        setAction('RESERVA');
        setNumHuespedes(2);
        setCapacidadMaxima(4);
        setEstadoHabitacion('DISPONIBLE');
        break;
      case 'CAPACITY_FAIL':
        setAction('RESERVA');
        setNumHuespedes(8); // Excede aforo
        setCapacidadMaxima(4);
        setEstadoHabitacion('DISPONIBLE');
        break;
      case 'MAINTENANCE_FAIL':
        setAction('RESERVA');
        setNumHuespedes(2);
        setCapacidadMaxima(4);
        setEstadoHabitacion('MANTENIMIENTO');
        break;
      case 'CHECKIN':
        setAction('CHECK_IN');
        setNumHuespedes(2);
        setCapacidadMaxima(4);
        setEstadoHabitacion('DISPONIBLE');
        break;
      case 'CHECKOUT':
        setAction('CHECK_OUT');
        setNumHuespedes(2);
        setCapacidadMaxima(4);
        setEstadoHabitacion('DISPONIBLE');
        break;
    }
  };

  const copyTerminalCommand = () => {
    navigator.clipboard.writeText('npm run demo:patrones');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER DE LA VISTA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                Tercer Corte - Patrones GoF
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                <Workflow className="h-3.5 w-3.5" />
                Chain of Responsibility & Observer
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Radio className="h-3.5 w-3.5" />
                Event-Driven Architecture
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Inspector de Patrones: Chain of Responsibility & Observer
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Laboratorio interactivo de evaluación arquitectónica. Inspecciona en tiempo real cómo los eslabones de
              validación (<span className="font-semibold text-slate-800">Chain of Responsibility</span>) aprueban o
              bloquean solicitudes y cómo el despachador de eventos (<span className="font-semibold text-slate-800">Observer</span>)
              notifica de forma reactiva a WhatsApp, Housekeeping, Auditoría y Message Broker frente al código monolítico procedimental.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              onClick={copyTerminalCommand}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-95"
              title="Copiar comando de consola"
            >
              <Terminal className="h-4 w-4 text-slate-600" />
              <span>npm run demo:patrones</span>
              {copiedCommand ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN A: SWITCHES DE OBSERVADORES EN TIEMPO REAL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                1. Switches de Observadores en Tiempo Real (Hot-Swap)
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Suscribe o desuscribe en caliente los observadores consumiendo el endpoint de{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-indigo-700">booking-service</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleAll(true)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              Suscribir Todos
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              Desuscribir Todos
            </button>
            <button
              onClick={loadObservers}
              disabled={isLoadingObservers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 active:scale-95"
              title="Recargar estado"
            >
              <RefreshCw className={cn('h-4 w-4', isLoadingObservers && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {observers.map((obs) => {
            const isWhatsApp = obs.id.includes('WhatsApp');
            const isHousekeeping = obs.id.includes('Housekeeping');
            const isAudit = obs.id.includes('Audit');
            const isBroker = obs.id.includes('Broker');

            const icon = isWhatsApp ? (
              <MessageSquare className="h-5 w-5 text-emerald-600" />
            ) : isHousekeeping ? (
              <Sparkles className="h-5 w-5 text-blue-600" />
            ) : isAudit ? (
              <ShieldCheck className="h-5 w-5 text-purple-600" />
            ) : (
              <Radio className="h-5 w-5 text-amber-600" />
            );

            const bgLight = isWhatsApp
              ? 'bg-emerald-50'
              : isHousekeeping
              ? 'bg-blue-50'
              : isAudit
              ? 'bg-purple-50'
              : 'bg-amber-50';

            const isToggling = togglingObserver === obs.name || togglingObserver === obs.id;

            return (
              <div
                key={obs.id}
                className={cn(
                  'relative flex flex-col justify-between rounded-xl border p-5 transition-all',
                  obs.enabled
                    ? 'border-slate-300 bg-white shadow-sm hover:border-indigo-300'
                    : 'border-slate-200 bg-slate-50/70 opacity-70'
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bgLight)}>
                      {icon}
                    </span>

                    {/* Switch Toggle Animado */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={obs.enabled}
                      disabled={isToggling}
                      onClick={() => handleToggleObserver(obs.name, obs.enabled)}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
                        obs.enabled ? 'bg-indigo-600' : 'bg-slate-300',
                        isToggling && 'opacity-50 cursor-wait'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          obs.enabled ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">{obs.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{obs.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5',
                      obs.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', obs.enabled ? 'bg-emerald-500' : 'bg-slate-400')} />
                    {obs.enabled ? 'Suscrito' : 'Desuscrito'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {isBroker ? 'Puerto 4003' : isWhatsApp ? 'wa.me' : 'In-Memory'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN B: SIMULADOR COMPARATIVO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              2. Simulador Comparativo (Con Patrones vs. Sin Patrones)
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Dispara eventos de ciclo de vida y compara la ejecución estructurada en microservicios frente al flujo procedimental monolítico.
          </p>
        </div>

        {/* SELECTOR DE MODO Y PRESETS */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Opción 1: Con Patrones */}
            <div
              onClick={() => setMode('PATTERNS')}
              className={cn(
                'cursor-pointer rounded-2xl border-2 p-5 transition-all',
                mode === 'PATTERNS'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                    GoF
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">Con Patrones (Chain + Observer)</h3>
                    <p className="text-xs text-indigo-700 font-medium">Arquitectura Refactorizada Tercer Corte</p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                  Desacoplado
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Cadena de 4 eslabones independientes para validación previa con short-circuit + Despacho reactivo a observadores suscritos mediante Subject.
              </p>
            </div>

            {/* Opción 2: Sin Patrones */}
            <div
              onClick={() => setMode('PROCEDURAL')}
              className={cn(
                'cursor-pointer rounded-2xl border-2 p-5 transition-all',
                mode === 'PROCEDURAL'
                  ? 'border-slate-800 bg-slate-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white font-bold text-xs">
                    IF
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">Sin Patrones (Procedimental)</h3>
                    <p className="text-xs text-slate-500 font-medium">Línea Base Monolítica Tradicional</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  Acoplado
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Método monolítico con if/else anidados inline y llamadas hardcoded a notificaciones sin posibilidad de suscribir/desuscribir dinámicamente.
              </p>
            </div>
          </div>

          {/* ACCIÓN A SIMULAR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Tipo de Evento / Transición de Reserva
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'RESERVA', label: 'Creación de Reserva', sub: 'RESERVA_CREADA' },
                { id: 'CHECK_IN', label: 'Check-In Huésped', sub: 'CHECK_IN_REALIZADO' },
                { id: 'CHECK_OUT', label: 'Check-Out Desalojo', sub: 'CHECK_OUT_REALIZADO' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setAction(act.id as any)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    action === act.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div className="text-sm">{act.label}</div>
                  <div className="text-[11px] font-mono text-slate-500">{act.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* PRESETS DE DEMOSTRACIÓN RÁPIDA */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Escenarios de Prueba Rápida (Casos de Éxito y Rechazo por Cadena)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('SUCCESS')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Caso Exitoso Estándar (2 Huéspedes / Disponible)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('CAPACITY_FAIL')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                Forzar Rechazo por Aforo (8 personas en Suite de 4)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('MAINTENANCE_FAIL')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Forzar Rechazo por Habitación en Mantenimiento
              </button>
              <button
                type="button"
                onClick={() => applyPreset('CHECKIN')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Prueba Check-in (WiFi + Llave)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('CHECKOUT')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                Prueba Check-out (Limpieza Prioritaria)
              </button>
            </div>
          </div>

          {/* PARÁMETROS DEL FORMULARIO */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Nombre Huésped</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">WhatsApp (10 dígitos)</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Habitación y Número</label>
              <input
                type="text"
                value={habitacionNumero}
                onChange={(e) => setHabitacionNumero(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Estado Habitación</label>
              <select
                value={estadoHabitacion}
                onChange={(e) => setEstadoHabitacion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="BLOQUEADA">BLOQUEADA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Huéspedes Solicitados</label>
              <input
                type="number"
                min={1}
                max={15}
                value={numHuespedes}
                onChange={(e) => setNumHuespedes(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Capacidad Máxima Hab.</label>
              <input
                type="number"
                min={1}
                max={15}
                value={capacidadMaxima}
                onChange={(e) => setCapacidadMaxima(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Fechas de Estadía</label>
              <div className="mt-1 text-xs font-mono font-semibold text-slate-700 py-2">
                {fechaInicio} → {fechaFin}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Monto Total COP</label>
              <input
                type="number"
                step={10000}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* BOTÓN DISPARADOR DE SIMULACIÓN */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Procesando Solicitud y Evaluando Eslabones...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Disparar Simulación y Analizar Trazabilidad ({mode === 'PATTERNS' ? 'Con Patrones' : 'Sin Patrones'})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN C: VISUALIZADOR DE TRAZABILIDAD */}
      {simulationResult && (
        <div className="space-y-6">
          {/* BANNER DE RESULTADO GLOBAL */}
          <div
            className={cn(
              'rounded-2xl border p-6 shadow-sm transition-all',
              simulationResult.success
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-rose-200 bg-rose-50/50'
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                    simulationResult.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  )}
                >
                  {simulationResult.success ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      {simulationResult.success ? 'Solicitud Aprobada y Procesada' : 'Solicitud Rechazada'}
                    </h3>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-bold',
                        simulationResult.success
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {simulationResult.mode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Transición: <span className="font-semibold text-slate-800">{simulationResult.action}</span> | Código:{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {simulationResult.reservationSummary?.codigoReserva || 'RSV-000'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 shadow-sm border border-slate-200">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>Latencia: {simulationResult.executionTimeMs} ms</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 shadow-sm border border-slate-200">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span>{simulationResult.validationTrace.length} eslabones validados</span>
                </div>
              </div>
            </div>

            {simulationResult.error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-100/60 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Motivo del Rechazo:</strong> {simulationResult.error}
                </span>
              </div>
            )}
          </div>

          {/* PASO 1: TRAZABILIDAD CHAIN OF RESPONSIBILITY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-indigo-600" />
                  Trazabilidad de Validación (Chain of Responsibility: validationTrace)
                </h3>
                <p className="text-xs text-slate-500">
                  Cada eslabón evalúa una única regla de negocio. Si un eslabón falla, interrumpe el flujo evitando operaciones no autorizadas.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {simulationResult.validationTrace.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-4 rounded-xl border p-4 transition-all',
                    step.passed
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-rose-200 bg-rose-50/40'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                      step.passed ? 'bg-emerald-600' : 'bg-rose-600'
                    )}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {step.name || step.step}
                      </h4>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold',
                          step.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        )}
                      >
                        {step.passed ? 'APROBADO' : 'RECHAZADO'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.message}</p>
                    {step.details && (
                      <div className="mt-2 text-[11px] font-mono text-slate-500 bg-slate-100/70 p-2 rounded-lg">
                        {JSON.stringify(step.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PASO 2: TRAZABILIDAD OBSERVER PATTERN */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg flex items-center gap-2">
                  <Radio className="h-5 w-5 text-indigo-600" />
                  Trazabilidad de Notificaciones Reactivas (Observer: notificationTrace)
                </h3>
                <p className="text-xs text-slate-500">
                  El Subject emite el evento y los observadores activos reaccionan de manera desacoplada sin afectar el flujo principal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {simulationResult.notificationTrace.map((notif, idx) => {
                const isNotified = notif.status === 'NOTIFIED';
                const isDisabled = notif.status === 'DISABLED';
                const isSkipped = notif.status === 'SKIPPED';

                return (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xl border p-5 space-y-3 transition-all',
                      isNotified
                        ? 'border-indigo-200 bg-indigo-50/20'
                        : isDisabled
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-slate-200 bg-slate-50/60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{notif.observer}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold',
                          isNotified
                            ? 'bg-emerald-100 text-emerald-800'
                            : isDisabled
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {notif.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                    {/* CALLOUT ESPECIAL DE WHATSAPP CON ENLACE DIRECTO */}
                    {notif.whatsappUrl && (
                      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                            <MessageSquare className="h-4 w-4 text-emerald-600" />
                            Enlace de WhatsApp Directo Generado (wa.me)
                          </span>
                          <a
                            href={notif.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                          >
                            <span>Abrir Chat WhatsApp</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="break-all font-mono text-[11px] text-emerald-700">
                          {notif.whatsappUrl}
                        </p>
                      </div>
                    )}

                    <div className="text-[10px] font-mono text-slate-400">
                      Timestamp: {notif.timestamp}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN D: MATRIZ COMPARATIVA Y DOCUMENTACIÓN RÁPIDA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-600" />
            Matriz Comparativa de Arquitectura: Con Patrones vs. Sin Patrones
          </h3>
          <p className="text-xs text-slate-500">
            Resumen técnico que sustenta las ventajas de modularidad y cumplimiento de principios SOLID (OCP y SRP).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Criterio Arquitectónico</th>
                <th className="px-4 py-3 text-slate-900">Sin Patrones (Línea Base Procedimental)</th>
                <th className="px-4 py-3 text-indigo-900 bg-indigo-50/50">Con Patrones (Chain + Observer)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Grado de Acoplamiento</td>
                <td className="px-4 py-3 text-rose-700">Alto (Tightly Coupled): Notificaciones invocadas directamente en el código de reserva.</td>
                <td className="px-4 py-3 text-emerald-700 bg-indigo-50/20">Bajo (Loose Coupling): Desacoplamiento total mediante bus de eventos del Subject.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Open/Closed Principle (OCP)</td>
                <td className="px-4 py-3 text-rose-700">Viola OCP: Agregar un nuevo canal (ej. Telegram) exige modificar y recompilar el servicio.</td>
                <td className="px-4 py-3 text-emerald-700 bg-indigo-50/20">Cumple OCP: Se añaden nuevos observadores o eslabones sin alterar el código existente.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Single Responsibility (SRP)</td>
                <td className="px-4 py-3 text-rose-700">Viola SRP: Un solo método &quot;Dios&quot; valida fechas, aforo, genera textos y despacha.</td>
                <td className="px-4 py-3 text-emerald-700 bg-indigo-50/20">Cumple SRP: Cada Handler valida una sola regla y cada Observer ejecuta una sola tarea.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Suscripción Dinámica en Vivo</td>
                <td className="px-4 py-3 text-slate-500">Imposible: El flujo es estático y cableado.</td>
                <td className="px-4 py-3 text-emerald-700 bg-indigo-50/20">Soportada en tiempo real mediante toggle caliente (Hot-Swap) por API.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Complejidad Ciclomática</td>
                <td className="px-4 py-3 text-amber-700">Alta: if/else anidados difíciles de testear de forma aislada.</td>
                <td className="px-4 py-3 text-emerald-700 bg-indigo-50/20">Baja: Cada eslabón se prueba unitariamente con mocks independientes.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
