import { Router } from 'express';
import PatronesController from '../controllers/patrones.controller.js';

const router = Router();

// Rutas pblicas/inspeccin para el laboratorio de patrones
router.get('/observers', PatronesController.getObservers);
router.post('/observers/toggle', PatronesController.toggleObserver);
router.post('/simulate', PatronesController.simulate);

export default router;
