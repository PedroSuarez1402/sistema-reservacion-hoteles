import { Servicio } from '../models/index.js';
import { NotFoundError } from '../utils/errors.util.js';

// Controlador tradicional/procedimental para Servicios Adicionales (Línea Base Sin Patrón)
class ServicioController {
  // GET /api/servicios - Lista de servicios sueltos
  static async index(req, res, next) {
    try {
      const servicios = await Servicio.findAll({
        where: { estado: 'ACTIVO' },
        order: [['nombre', 'ASC']],
      });

      return res.status(200).json({
        success: true,
        message: 'Lista de servicios obtenida correctamente',
        data: servicios,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/servicios/:id - Detalle de un servicio suelto
  static async show(req, res, next) {
    try {
      const { id } = req.params;
      const servicio = await Servicio.findByPk(id);

      if (!servicio) {
        throw new NotFoundError('Servicio no encontrado');
      }

      return res.status(200).json({
        success: true,
        message: 'Servicio obtenido correctamente',
        data: servicio,
      });
    } catch (error) {
      next(error);
    }
  }
};

export default ServicioController;
