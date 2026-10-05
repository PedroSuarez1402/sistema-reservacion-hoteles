import PaqueteService from '../services/paquete.service.js';

class PaqueteController {
  // GET /api/paquetes - Lista paquetes (activos por defecto o todos si se pasa ?all=true)
  static async index(req, res, next) {
    try {
      const all = req.query.all === 'true';
      const estado = req.query.estado || null;
      const paquetes = await PaqueteService.getAll({ all, estado });

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
      const paquete = await PaqueteService.getById(id);

      return res.status(200).json({
        success: true,
        message: 'Paquete obtenido correctamente',
        data: paquete,
        composite_desglose: paquete.composite_desglose,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/paquetes - Crea un nuevo paquete turístico (Admin)
  static async create(req, res, next) {
    try {
      const nuevoPaquete = await PaqueteService.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Paquete turístico creado exitosamente',
        data: nuevoPaquete,
        composite_desglose: nuevoPaquete.composite_desglose,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/paquetes/:id - Modifica un paquete turístico (Admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const actualizado = await PaqueteService.update(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Paquete turístico actualizado correctamente',
        data: actualizado,
        composite_desglose: actualizado.composite_desglose,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/paquetes/:id/status - Publica o desactiva un paquete (Admin)
  static async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { estado } = req.body || {};
      const actualizado = await PaqueteService.toggleStatus(id, estado);

      return res.status(200).json({
        success: true,
        message: `Estado del paquete actualizado a '${actualizado.estado}'`,
        data: actualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/paquetes/:id - Elimina o desactiva un paquete (Admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const resultado = await PaqueteService.delete(id);

      return res.status(200).json({
        success: true,
        message: resultado.message,
        data: resultado.data || null,
        deleted: resultado.deleted,
        deactivated: resultado.deactivated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PaqueteController;
