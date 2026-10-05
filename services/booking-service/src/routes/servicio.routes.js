import { Router } from 'express';
import ServicioController from '../controllers/servicio.controller.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas de consulta
router.get('/', ServicioController.index);
router.get('/:id', ServicioController.show);

// Rutas administrativas (exclusivo ADMIN)
router.post('/', verifyToken, isAdmin, ServicioController.create);
router.put('/:id', verifyToken, isAdmin, ServicioController.update);
router.patch('/:id/status', verifyToken, isAdmin, ServicioController.toggleStatus);
router.delete('/:id', verifyToken, isAdmin, ServicioController.delete);

export default router;
