import { Router } from 'express';
import ServicioController from '../controllers/servicio.controller.js';

const router = Router();

// Rutas públicas para servicios adicionales
router.get('/', ServicioController.index);
router.get('/:id', ServicioController.show);

export default router;
