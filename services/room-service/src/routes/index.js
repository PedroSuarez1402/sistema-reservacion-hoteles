import { Router } from 'express';
import sequelize from '../config/database.js';
import roomRoutes from './room.routes.js';
import tagRoutes from './tag.routes.js';

const router = Router();

// Endpoint healthcheck: verifica conexión BD
router.get('/health', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      service: 'room-service',
      message: 'Servidor funcionando y conexión a BD exitosa',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Webhook Receptor del Message Broker (Subscriber Endpoint)
// ===========================================================================
router.post('/events', function subscriberEventHandler(req, res) {
  try {
    const { eventId, topico, payload, timestamp } = req.body || {};
    console.log(
      `\n📨 [ROOM-SERVICE] EVENTO ASÍNCRONO RECIBIDO (Pub/Sub Broker)` +
      `\n   eventId    : ${eventId || '—'}` +
      `\n   topico     : ${topico || '—'}` +
      `\n   timestamp  : ${timestamp || new Date().toISOString()}` +
      `\n   Reserva ID : ${payload && payload.id ? payload.id : '—'}` +
      `\n   Habitación : ${payload && payload.habitacion_id ? payload.habitacion_id : '—'}` +
      `\n   Huésped    : ${payload && payload.usuario_id ? payload.usuario_id : '—'}` +
      `\n   Fechas     : ${payload ? `${payload.fecha_inicio || '?'} → ${payload.fecha_fin || '?'}` : '—'}` +
      `\n   Total USD  : ${payload && payload.precio_total ? '$' + Number(payload.precio_total).toFixed(2) : '—'}` +
      `\n   Estado     : ${payload && payload.estado ? payload.estado : '—'}` +
      '\n   --------------------------------------------'
    );
    // Respuesta inmediata con 204 No Content para confirmar recepción sin retener el bus
    return res.status(204).end();
  } catch (err) {
    console.error('💥 [ROOM-SERVICE] Error procesando evento Pub/Sub:', err && err.message);
    return res.status(500).json({ ok: false, error: 'Subscriber room-service procesando evento: ' + (err && err.message || err) });
  }
});

// ROUTES - Room Service solo expone: habitaciones (+ imágenes) + tags
router.use('/rooms', roomRoutes);
router.use('/tags', tagRoutes);

export default router;
