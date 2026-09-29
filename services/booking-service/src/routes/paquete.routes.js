import { Router } from 'express';
import PaqueteController from '../controllers/paquete.controller.js';

const router = Router();

router.get('/', PaqueteController.index);
router.get('/:id', PaqueteController.show);

export default router;
