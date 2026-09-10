import { Router } from 'express';
import TagController from '../controllers/tag.controller.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', TagController.index);
router.get('/:id', verifyToken, isAdmin, TagController.show);
router.post('/', verifyToken, isAdmin, TagController.store);
router.patch('/:id', verifyToken, isAdmin, TagController.update);
router.delete('/:id', verifyToken, isAdmin, TagController.destroy);

export default router;
