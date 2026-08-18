import { Router } from 'express';
import RoomController from '../controllers/room.controller.js';
import { verifyToken, isAdmin, isRecepcionOrAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', RoomController.getAll);
router.get('/available', RoomController.getAvailable);
router.post('/', verifyToken, isAdmin, RoomController.create);
router.get('/:id', RoomController.getById);
router.put('/:id', verifyToken, isAdmin, RoomController.update);
router.delete('/:id', verifyToken, isAdmin, RoomController.remove);

export default router;
