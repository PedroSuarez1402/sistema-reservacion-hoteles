import { Router } from 'express';
import RoomController from '../controllers/room.controller.js';
import RoomImageController from '../controllers/roomImage.controller.js';
import { verifyToken, isAdmin, isRecepcionOrAdmin } from '../middlewares/auth.middleware.js';
import { uploadRoomImagesArray } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/', RoomController.getAll);
router.get('/available', RoomController.getAvailable);
router.post('/', verifyToken, isAdmin, RoomController.create);
router.get('/:id', RoomController.getById);
router.put('/:id', verifyToken, isAdmin, RoomController.update);
router.delete('/:id', verifyToken, isAdmin, RoomController.remove);

router.post(
  '/:habitacionId/images',
  verifyToken,
  isAdmin,
  uploadRoomImagesArray,
  RoomImageController.uploadImages
);
router.patch('/:habitacionId/images/order', verifyToken, isAdmin, RoomImageController.reorder);
router.patch(
  '/:habitacionId/images/:id/set-main',
  verifyToken,
  isAdmin,
  RoomImageController.setMain
);
router.delete(
  '/:habitacionId/images/:id',
  verifyToken,
  isAdmin,
  RoomImageController.remove
);

export default router;
