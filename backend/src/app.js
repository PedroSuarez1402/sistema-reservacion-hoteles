import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';

const app = express();

app.use(helmet());

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

app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada - ' + req.method + ' ' + req.originalUrl,
  });
});

app.use(errorHandler);

export default app;
