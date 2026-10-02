import { Router } from 'express';
import ClienteController from '../controllers/cliente.controller.js';
import { verifyToken, isRecepcionOrAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las operaciones sobre clientes las realizan recepcionistas o administradores
router.use(verifyToken, isRecepcionOrAdmin);

router.get('/', ClienteController.getAll);
router.get('/search', ClienteController.search);
router.post('/find-or-create', ClienteController.findOrCreate);
router.get('/doc/:documento', ClienteController.getByDocumento);
router.get('/:id', ClienteController.getById);
router.post('/', ClienteController.create);
router.put('/:id', ClienteController.update);
router.delete('/:id', ClienteController.remove);

// Rutas de Acompañantes
router.post('/:id/acompanantes', ClienteController.addAcompanante);
router.delete('/:id/acompanantes/:acompananteId', ClienteController.removeAcompanante);

export default router;
