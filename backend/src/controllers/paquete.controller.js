import { Paquete, Servicio } from '../models/index.js';
import { NotFoundError } from '../utils/errors.util.js';

// Controlador tradicional/procedimental para Paquetes Turísticos (Línea Base Sin Patrón)
class PaqueteController {
  // GET /api/paquetes - Lista de paquetes activos con sus servicios incluidos
  static async index(req, res, next) {
    try {
      const paquetes = await Paquete.findAll({
        where: { estado: 'ACTIVO' },
        include: [
          {
            model: Servicio,
            as: 'servicios',
            through: { attributes: ['cantidad'] },
          },
        ],
        order: [['nombre', 'ASC']],
      });

      return res.status(200).json({
        success: true,
        message: 'Lista de paquetes obtenida correctamente',
        data: paquetes,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/paquetes/:id - Paquete por ID con el desglose de sus servicios
  static async show(req, res, next) {
    try {
      const { id } = req.params;
      const paquete = await Paquete.findByPk(id, {
        include: [
          {
            model: Servicio,
            as: 'servicios',
            through: { attributes: ['cantidad'] },
          },
        ],
      });

      if (!paquete) {
        throw new NotFoundError('Paquete no encontrado');
      }

      return res.status(200).json({
        success: true,
        message: 'Paquete obtenido correctamente',
        data: paquete,
      });
    } catch (error) {
      next(error);
    }
  }
};

export default PaqueteController;
