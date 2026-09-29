import { Paquete, Servicio } from '../models/index.js';
import { NotFoundError } from '../utils/errors.util.js';
import { PaqueteCompuesto, ServicioSimple } from '../composite/index.js';

class PaqueteController {
  // GET /api/paquetes - Lista todos los paquetes activos con sus servicios
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

  // GET /api/paquetes/:id - Paquete por ID con desglose generado por el Patrón Composite
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

      // Demostración del Composite: ensamblamos el árbol y obtenemos su desglose polimórfico
      const paqueteComposite = new PaqueteCompuesto({
        paqueteId: paquete.id,
        nombre: paquete.nombre,
        descuentoPorcentaje: Number(paquete.descuento_porcentaje) || 0,
        descripcion: paquete.descripcion,
      });

      if (paquete.servicios && Array.isArray(paquete.servicios)) {
        for (const serv of paquete.servicios) {
          const cantidad = serv.PaqueteServicio?.cantidad || 1;
          paqueteComposite.agregar(
            new ServicioSimple({
              servicioId: serv.id,
              nombre: serv.nombre,
              precioUnitario: Number(serv.precio),
              cantidad,
              descripcion: serv.descripcion,
            })
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Paquete obtenido correctamente',
        data: paquete,
        composite_desglose: paqueteComposite.obtenerDesglose(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PaqueteController;
