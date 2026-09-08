import { Router } from 'express';
import sequelize from '../config/database.js';
import userRoutes from './user.routes.js';
import roomRoutes from './room.routes.js';
import reservationRoutes from './reservation.routes.js';
import tagRoutes from './tag.routes.js';

const router = Router();

// Endpoint healthcheck: verifica conexión BD
router.get('/health', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      message: 'Servidor funcionando y conexión a BD exitosa',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.use('/users', userRoutes);
router.use('/rooms', roomRoutes);
router.use('/reservations', reservationRoutes);
router.use('/tags', tagRoutes);

export default router;
