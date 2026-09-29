import { Router } from 'express';
import sequelize from '../config/database.js';
import reservationRoutes from './reservation.routes.js';
import userRoutes from './user.routes.js';
import paqueteRoutes from './paquete.routes.js';

const router = Router();

// Endpoint healthcheck: verifica conexión BD
router.get('/health', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      service: 'booking-service',
      message: 'Servidor funcionando y conexión a BD exitosa',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ROUTES - Booking Service expone: reservaciones + usuarios (incl. auth) + paquetes
router.use('/reservations', reservationRoutes);
router.use('/users', userRoutes);
router.use('/paquetes', paqueteRoutes);

export default router;
