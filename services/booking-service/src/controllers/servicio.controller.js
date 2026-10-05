import ServicioService from '../services/servicio.service.js';

class ServicioController {
  // GET /api/servicios - Lista servicios atómicos
  static async index(req, res, next) {
    try {
      const all = req.query.all === 'true';
      const estado = req.query.estado || null;
      const servicios = await ServicioService.getAll({ all, estado });

      return res.status(200).json({
        success: true,
        message: 'Lista de servicios obtenida correctamente',
        data: servicios,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/servicios/:id - Detalle de un servicio
  static async show(req, res, next) {
    try {
      const { id } = req.params;
      const servicio = await ServicioService.getById(id);

      return res.status(200).json({
        success: true,
        message: 'Servicio obtenido correctamente',
        data: servicio,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/servicios - Crea un nuevo servicio (Admin)
  static async create(req, res, next) {
    try {
      const nuevoServicio = await ServicioService.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Servicio creado exitosamente',
        data: nuevoServicio,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/servicios/:id - Modifica un servicio existente (Admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const actualizado = await ServicioService.update(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Servicio actualizado correctamente',
        data: actualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/servicios/:id/status - Publica o desactiva un servicio (Admin)
  static async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { estado } = req.body || {};
      const actualizado = await ServicioService.toggleStatus(id, estado);

      return res.status(200).json({
        success: true,
        message: `Estado del servicio actualizado a '${actualizado.estado}'`,
        data: actualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/servicios/:id - Elimina o desactiva un servicio (Admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const resultado = await ServicioService.delete(id);

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

export default ServicioController;
