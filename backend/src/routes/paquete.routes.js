import { Router } from 'express';
import PaqueteController from '../controllers/paquete.controller.js';

const router = Router();

// Rutas públicas para paquetes turísticos
router.get('/', PaqueteController.index);
router.get('/:id', PaqueteController.show);

export default router;
