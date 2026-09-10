import { Router } from 'express';
import sequelize from '../config/database.js';
import reservationRoutes from './reservation.routes.js';
import userRoutes from './user.routes.js';

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

// ROUTES - Booking Service solo expone: reservaciones + usuarios (incl. auth)
router.use('/reservations', reservationRoutes);
router.use('/users', userRoutes);

export default router;
