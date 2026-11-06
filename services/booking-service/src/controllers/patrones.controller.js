import { defaultEventManager } from '../observers/index.js';
import { buildValidationChain } from '../chain/index.js';
import { procesarReservaProcedimental } from '../services/procedural-booking.service.js';

class PatronesController {
  /**
   * Obtiene la lista de observadores registrados y su estado actual.
   * GET /api/patrones/observers
   */
  async getObservers(req, res, next) {
    try {
      const observers = defaultEventManager.getObservers();
      res.json({
        success: true,
        observers,
        total: observers.length,
        activeCount: observers.filter(o => o.enabled).length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cambia en tiempo real el estado de suscripcin de un observador.
   * POST /api/patrones/observers/toggle
   * Body: { name: string, enabled: boolean }
   */
  async toggleObserver(req, res, next) {
    try {
      const { name, enabled } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "El campo 'name' del observador es requerido.",
        });
      }

      const updated = defaultEventManager.setObserverStatus(name, enabled);
      res.json({
        success: true,
        message: `Observador '${name}' ${updated.enabled ? 'suscrito (habilitado)' : 'desuscrito (deshabilitado)'} en tiempo real.`,
        observer: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dispara una simulacin comparativa (Con Patrones vs. Procedimental).
   * POST /api/patrones/simulate
   * Body: {
   *   mode: 'PATTERNS' | 'PROCEDURAL',
   *   action: 'RESERVA' | 'CHECK_IN' | 'CHECK_OUT',
   *   payload: { ... }
   * }
   */
  async simulate(req, res, next) {
    try {
      const startTime = Date.now();
      const { mode = 'PATTERNS', action = 'RESERVA', payload = {} } = req.body;

      // Normalizar datos de la solicitud
      const requestData = {
        id: payload.codigoReserva || 'RSV-' + Math.floor(1000 + Math.random() * 9000),
        codigoReserva: payload.codigoReserva || 'RSV-' + Math.floor(1000 + Math.random() * 9000),
        clienteNombre: payload.clienteNombre || 'Pedro Surez',
        cliente_nombre: payload.clienteNombre || 'Pedro Surez',
        telefono: payload.telefono || '3183389453',
        cliente_telefono: payload.telefono || '3183389453',
        habitacionId: payload.habitacionId || 'hab-suite-301',
        habitacion_id: payload.habitacionId || 'hab-suite-301',
        habitacionNumero: payload.habitacionNumero || 'Suite 301',
        habitacion_numero: payload.habitacionNumero || 'Suite 301',
        estadoHabitacion: payload.estadoHabitacion || 'DISPONIBLE',
        fechaInicio: payload.fechaInicio || new Date().toISOString().split('T')[0],
        fecha_inicio: payload.fechaInicio || new Date().toISOString().split('T')[0],
        fechaFin: payload.fechaFin || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        fecha_fin: payload.fechaFin || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        numHuespedes: payload.numHuespedes !== undefined ? Number(payload.numHuespedes) : 2,
        capacidadMaximaHabitacion: payload.capacidadMaximaHabitacion !== undefined ? Number(payload.capacidadMaximaHabitacion) : 4,
        clienteEstado: payload.clienteEstado || 'ACTIVO',
        metodoPago: payload.metodoPago || 'TRANSFERENCIA',
        anticipo: payload.anticipo !== undefined ? Number(payload.anticipo) : 50000,
        total: payload.total !== undefined ? Number(payload.total) : 260000,
        precio_total: payload.total !== undefined ? Number(payload.total) : 260000,
        noches: payload.noches !== undefined ? Number(payload.noches) : 2,
        isHistoricalSimulation: true,
      };

      // MODO 1: PROCEDIMENTAL (SIN PATRONES)
      if (mode === 'PROCEDURAL') {
        const result = procesarReservaProcedimental(requestData, action);
        return res.json(result);
      }

      // MODO 2: CON PATRONES (Chain of Responsibility + Observer)
      // 1. Ejecucin de Chain of Responsibility
      const validationChain = buildValidationChain();
      const validationContext = { ...requestData, trace: [], logs: [] };
      const chainResult = await validationChain.handle(validationContext);

      const validationTrace = validationContext.trace || [];

      if (chainResult && chainResult.success === false) {
        return res.json({
          success: false,
          mode: 'PATTERNS (Chain of Responsibility + Observer)',
          action,
          executionTimeMs: Date.now() - startTime,
          validationTrace,
          notificationTrace: [
            {
              observer: 'ReservationEventManager (Subject)',
              status: 'SKIPPED',
              message: `Notificaciones canceladas: La solicitud fue rechazada por el eslabn '${chainResult.handler}'.`,
              timestamp: new Date().toISOString(),
            },
          ],
          whatsappUrl: null,
          error: chainResult.error,
        });
      }

      // 2. Ejecucin de Observer (Disparo del evento a los observadores suscritos)
      const eventType = action === 'RESERVA' ? 'RESERVA_CREADA' : action === 'CHECK_IN' ? 'CHECK_IN_REALIZADO' : action === 'CHECK_OUT' ? 'CHECK_OUT_REALIZADO' : action;
      const notificationTrace = await defaultEventManager.notify(eventType, requestData);

      // Buscar URL de WhatsApp generada
      const whatsAppTrace = notificationTrace.find(t => t.id === 'WhatsAppNotificationObserver' || t.observer === 'WhatsAppNotificationObserver');
      const whatsappUrl = whatsAppTrace?.whatsappUrl || whatsAppTrace?.resultado?.whatsappUrl || null;

      res.json({
        success: true,
        mode: 'PATTERNS (Chain of Responsibility + Observer)',
        action,
        executionTimeMs: Date.now() - startTime,
        validationTrace,
        notificationTrace,
        whatsappUrl,
        reservationSummary: {
          codigoReserva: requestData.codigoReserva,
          cliente: requestData.clienteNombre,
          habitacion: requestData.habitacionNumero,
          total: requestData.total,
          noches: requestData.noches,
          estado: action === 'CHECK_IN' ? 'CHECK_IN' : action === 'CHECK_OUT' ? 'CHECK_OUT' : 'CONFIRMADA',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PatronesController();
