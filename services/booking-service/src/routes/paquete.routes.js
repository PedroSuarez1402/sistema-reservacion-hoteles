import { Router } from 'express';
import PaqueteController from '../controllers/paquete.controller.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas de consulta (públicas / staff)
router.get('/', PaqueteController.index);
router.get('/:id', PaqueteController.show);

// Rutas de administración y configuración de planes turísticos (exclusivo ADMIN)
router.post('/', verifyToken, isAdmin, PaqueteController.create);
router.put('/:id', verifyToken, isAdmin, PaqueteController.update);
router.patch('/:id/status', verifyToken, isAdmin, PaqueteController.toggleStatus);
router.delete('/:id', verifyToken, isAdmin, PaqueteController.delete);

export default router;
