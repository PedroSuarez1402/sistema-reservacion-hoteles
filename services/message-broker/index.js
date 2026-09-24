/**
 * Message Broker Central (Patrón Publish/Subscribe)
 * Intermediario autónomo encargado del enrutamiento asíncrono de eventos entre microservicios.
 */

import express from 'express';
import cors from 'cors';

const PORT = Number(process.env.PORT) || 4003;
const BROKER_URL = process.env.BROKER_URL || `http://localhost:${PORT}`;

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Almacenamiento en memoria de suscriptores y registro histórico
const SUBSCRIPTIONS = Object.create(null);// Mapa: topico -> [{ subscriberUrl, createdAt }]
const EVENT_HISTORY = [];
const MAX_HISTORY = Number(process.env.BROKER_MAX_HISTORY) || 1000;

function uidShort() { return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }

// 1. Registro de Suscriptores (Subscribe)
app.post('/api/broker/subscribe', function subscribeHandler(req, res) {
  try {
    const { topico, subscriberUrl } = req.body || {};
    const top = String(topico || '').trim().toUpperCase();
    const url = String(subscriberUrl || '').trim();

    if (!top) return res.status(400).json({ ok: false, error: 'Falta el campo obligatorio `topico` (non-empty string).' });
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ ok: false, error: '`subscriberUrl` inválido. Debe ser URL absoluta (http://...) del endpoint donde recibir el POST del evento.' });
    }

    const bucket = (SUBSCRIPTIONS[top] ||= []);
    if (bucket.some((s) => s.subscriberUrl === url)) {
      return res.status(200).json({ ok: true, info: 'Subscriber ya registrado para este tópico (sin duplicar).', topico: top, subscriberUrl: url });
    }
    bucket.push({ subscriberUrl: url, createdAt: new Date().toISOString() });

    return res.status(201).json({
      ok: true,
      message: `Suscrito correctamente al tópico '${top}'.`,
      topico: top,
      subscriberUrl: url,
      totalSubs: bucket.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: `subscribeHandler crash: ${err && err.message ? err.message : String(err)}` });
  }
});

// 2. Publicación y Despacho de Eventos (Publish)
app.post('/api/broker/publish', function publishHandler(req, res) {
  try {
    const { topico, payload, publishedBy } = req.body || {};
    const top = String(topico || '').trim().toUpperCase();
    if (!top) return res.status(400).json({ ok: false, error: 'Falta `topico` en el cuerpo de publish.' });

    const eventId = uidShort();
    const timestamp = new Date().toISOString();

    const event = Object.freeze({
      id: eventId,
      topico: top,
      payload: payload === undefined ? null : JSON.parse(JSON.stringify(payload)), // deep-clone anti-mut
      timestamp,
      publishedBy: publishedBy || null,
      dispatch: [],
    });

    // Auditoría histórica
    EVENT_HISTORY.unshift(event);
    while (EVENT_HISTORY.length > MAX_HISTORY) EVENT_HISTORY.pop();

    // Despacho asíncrono no bloqueante a los suscriptores registrados
    const subsForTopic = SUBSCRIPTIONS[top] || [];
    setImmediate(async function dispatchAsync() {
      for (const s of subsForTopic) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(s.subscriberUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-broker-event-id': eventId, 'x-broker-topico': top },
            body: JSON.stringify({ eventId, topico: top, payload: event.payload, timestamp }),
            signal: controller.signal,
          }).finally(() => clearTimeout(timer));
          event.dispatch.push({
            url: s.subscriberUrl,
            status: resp.status,
            at: new Date().toISOString(),
          });
        } catch (err) {
          event.dispatch.push({
            url: s.subscriberUrl,
            status: 'ERROR',
            at: new Date().toISOString(),
            err: err && err.message ? err.message : String(err),
          });
        }
      }
    });

    // Retorna 202 Accepted inmediatamente al Publisher
    return res.status(202).json({
      ok: true,
      accepted: true,
      message: `Evento '${top}' publicado correctamente. Despachando asíncronamente a ${subsForTopic.length} suscriptor(es).`,
      eventId,
      topico: top,
      timestamp,
      pendingSubscribers: subsForTopic.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: `publishHandler crash: ${err && err.message ? err.message : String(err)}` });
  }
});

// 3. Consulta de Auditoría (Historial)
app.get('/api/broker/events', function eventsHandler(req, res) {
  try {
    let arr = EVENT_HISTORY.slice();
    const top = String(req.query.topico || '').trim().toUpperCase();
    if (top) arr = arr.filter((e) => e.topico === top);
    const lim = Number(req.query.limit) || 0;
    if (Number.isFinite(lim) && lim > 0) arr = arr.slice(0, lim);
    return res.json({
      ok: true,
      total: arr.length,
      totalSubsByTopic: Object.fromEntries(
        Object.entries(SUBSCRIPTIONS).map(([k, v]) => [k, v.length])
      ),
      events: arr,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
});

// 4. Verificación de Salud
app.get('/api/health', function healthHandler(_req, res) {
  return res.json({
    status: 'ok',
    service: 'message-broker',
    port: PORT,
    brokerUrl: BROKER_URL,
    timestamp: new Date().toISOString(),
    subs: Object.fromEntries(Object.entries(SUBSCRIPTIONS).map(([k, v]) => [k, v.length])),
    historyCount: EVENT_HISTORY.length,
    maxHistory: MAX_HISTORY,
  });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Broker] Message Broker escuchando en puerto ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Broker] El puerto ${PORT} ya está ocupado.`);
  } else {
    console.error('[Broker] Error en servidor:', err);
  }
  process.exit(1);
});

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[Broker] Broker shutdown (${sig}).`);  
    try { server.close(() => process.exit(0)); } catch (_) { process.exit(0); }
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
