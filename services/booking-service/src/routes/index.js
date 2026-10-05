import { Router } from 'express';
import sequelize from '../config/database.js';
import reservationRoutes from './reservation.routes.js';
import userRoutes from './user.routes.js';
import paqueteRoutes from './paquete.routes.js';
import clienteRoutes from './cliente.routes.js';
import servicioRoutes from './servicio.routes.js';

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

// ROUTES - Booking Service expone: reservaciones + clientes + usuarios (staff) + paquetes + servicios
router.use('/reservations', reservationRoutes);
router.use('/clientes', clienteRoutes);
router.use('/users', userRoutes);
router.use('/paquetes', paqueteRoutes);
router.use('/servicios', servicioRoutes);

export default router;
