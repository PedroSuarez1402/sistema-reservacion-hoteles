import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';

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
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
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
    nombre: 'Booking Service - Sistema de Reservaciones de Hoteles',
    version: '1.0.0',
    servicio: 'Usuarios, Autenticación, Reservaciones',
    puerto: process.env.PORT || 4002,
    documentacion: {
      base: '/api',
      health: '/api/health',
      auth_usuarios: '/api/users',
      reservaciones: '/api/reservations',
    },
  });
});

app.use('/api', routes);

app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada - ' + req.method + ' ' + req.originalUrl,
    service: 'booking-service',
  });
});

app.use(errorHandler);

export default app;
