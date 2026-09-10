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

// ROUTES - Room Service solo expone: habitaciones (+ imágenes) + tags
router.use('/rooms', roomRoutes);
router.use('/tags', tagRoutes);

export default router;
