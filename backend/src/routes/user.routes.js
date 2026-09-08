import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import { verifyToken, isAdmin, isRecepcionOrAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', UserController.login);
router.get('/me', verifyToken, UserController.me);
router.get('/', verifyToken, isRecepcionOrAdmin, UserController.getAll);
router.post('/', UserController.create);
router.get('/:id', verifyToken, UserController.getById);
router.get('/:id/summary', verifyToken, isRecepcionOrAdmin, UserController.getSummary);
router.put('/:id', verifyToken, UserController.update);
router.delete('/:id', verifyToken, isAdmin, UserController.remove);

export default router;
