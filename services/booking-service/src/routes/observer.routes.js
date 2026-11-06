/**
 * Rutas para gestión dinámica de Observadores (Patrón Observer)
 * - GET  /observers        -> Consulta observadores activos y catálogo completo
 * - POST /observers/toggle -> Suscribe o desuscribe un observador en caliente
 */

import { Router } from 'express';
import ReservationController from '../controllers/reservation.controller.js';

const router = Router();

router.get('/', ReservationController.getObservers);
router.post('/toggle', ReservationController.toggleObserver);

export default router;
