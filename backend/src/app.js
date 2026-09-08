import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'blob:', 'coresg-normal.trae.ai'],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  '/api/v1/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '1y',
    immutable: true,
    // Configura headers cache para imágenes
    setHeaders(res, filePath) {
      if (filePath.match(/\.(jpe?g|png|webp)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos',
  },
});
app.use('/api', apiLimiter);

// Ruta raíz: información y endpoints API
app.get('/', (req, res) => {
  res.json({
    nombre: 'Sistema de Reservaciones de Hoteles - API',
    version: '1.0.0',
    documentacion: {
      base: '/api/v1',
      health: '/api/v1/health',
      usuarios: '/api/v1/users',
      habitaciones: '/api/v1/rooms',
      reservaciones: '/api/v1/reservations',
    },
  });
});

app.use('/api/v1', routes);

// Middleware: maneja rutas no encontradas 404
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada - ' + req.method + ' ' + req.originalUrl,
  });
});

app.use(errorHandler);

export default app;
