import { Router } from 'express';
import ReservationController from '../controllers/reservation.controller.js';
import { verifyToken, isRecepcionOrAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, isRecepcionOrAdmin, ReservationController.getAll);
router.get('/me', verifyToken, ReservationController.getMyReservations);
router.post('/', verifyToken, ReservationController.create);
router.get('/:id', verifyToken, ReservationController.getById);
router.put('/:id', verifyToken, ReservationController.update);
router.patch('/:id/cancel', verifyToken, ReservationController.cancel);
router.delete('/:id', verifyToken, isRecepcionOrAdmin, ReservationController.remove);

export default router;
