import TagService from '../services/tag.service.js';

// Serializa etiqueta a objeto plano
function serialize(tag) {
  if (!tag) return null;
  return {
    id: tag.id,
    nombre: tag.nombre,
    descripcion: tag.descripcion ?? null,
    createdAt: tag.createdAt ?? undefined,
    updatedAt: tag.updatedAt ?? undefined,
  };
}

// Objeto exportado controlador Etiquetas
export default {
  serialize,

  // Obtiene lista de etiquetas, opcionalmente filtra por keyword
  async index(req, res) {
    const { keyword } = req.query || {};
    const rows = await TagService.getAll({ keyword });
    res.json({
      success: true,
      message: 'Lista de etiquetas cargada correctamente',
      data: rows.map(serialize),
    });
  },

  // Obtiene una etiqueta por su ID
  async show(req, res) {
    const { id } = req.params;
    const row = await TagService.getById(id);
    res.json({
      success: true,
      message: 'Etiqueta obtenida correctamente',
      data: serialize(row),
    });
  },

  // Crea una nueva etiqueta
  async store(req, res) {
    const created = await TagService.create(req.body || {});
    res.status(201).json({
      success: true,
      message: 'Etiqueta creada correctamente',
      data: serialize(created),
    });
  },

  // Actualiza una etiqueta existente
  async update(req, res) {
    const { id } = req.params;
    const updated = await TagService.update(id, req.body || {});
    res.json({
      success: true,
      message: 'Etiqueta actualizada correctamente',
      data: serialize(updated),
    });
  },

  // Elimina una etiqueta por su ID
  async destroy(req, res) {
    const { id } = req.params;
    await TagService.remove(id);
    res.status(200).json({
      success: true,
      message: 'Etiqueta eliminada correctamente',
    });
  },
};
