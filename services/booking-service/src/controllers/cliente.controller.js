import ClienteService from '../services/cliente.service.js';

class ClienteController {
  // Lista paginada con filtro
  static async getAll(req, res, next) {
    try {
      const { keyword, page, limit } = req.query || {};
      const result = await ClienteService.getAll({ keyword, page, limit });
      return res.status(200).json({
        success: true,
        message: 'Clientes obtenidos correctamente',
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  // Búsqueda rápida para autocompletar en modales
  static async search(req, res, next) {
    try {
      const { keyword, q, limit } = req.query || {};
      const term = keyword || q || '';
      const items = await ClienteService.search(term, limit);
      return res.status(200).json({
        success: true,
        message: 'Búsqueda de clientes completada',
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  // Detalle por ID
  static async getById(req, res, next) {
    try {
      const cliente = await ClienteService.getById(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Cliente obtenido correctamente',
        data: cliente,
      });
    } catch (error) {
      next(error);
    }
  }

  // Buscar por Documento
  static async getByDocumento(req, res, next) {
    try {
      const cliente = await ClienteService.getByDocumento(req.params.documento);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado',
          data: null,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Cliente encontrado',
        data: cliente,
      });
    } catch (error) {
      next(error);
    }
  }

  // Crear nuevo cliente
  static async create(req, res, next) {
    try {
      const cliente = await ClienteService.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Cliente registrado exitosamente',
        data: cliente,
      });
    } catch (error) {
      next(error);
    }
  }

  // Resolver o crear cliente
  static async findOrCreate(req, res, next) {
    try {
      const cliente = await ClienteService.findOrCreate(req.body);
      return res.status(200).json({
        success: true,
        message: 'Cliente verificado exitosamente',
        data: cliente,
      });
    } catch (error) {
      next(error);
    }
  }

  // Actualizar datos
  static async update(req, res, next) {
    try {
      const cliente = await ClienteService.update(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Cliente actualizado correctamente',
        data: cliente,
      });
    } catch (error) {
      next(error);
    }
  }

  // Eliminar cliente
  static async remove(req, res, next) {
    try {
      await ClienteService.delete(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Cliente eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Agregar acompañante
  static async addAcompanante(req, res, next) {
    try {
      const acompanante = await ClienteService.addAcompanante(req.params.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Acompañante agregado exitosamente',
        data: acompanante,
      });
    } catch (error) {
      next(error);
    }
  }

  // Eliminar acompañante
  static async removeAcompanante(req, res, next) {
    try {
      await ClienteService.deleteAcompanante(req.params.acompananteId);
      return res.status(200).json({
        success: true,
        message: 'Acompañante eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ClienteController;
