import { Op } from 'sequelize';
import Tag from '../models/Tag.js';

const DEFAULT_ATTRIBUTES = ['id', 'nombre', 'descripcion', 'createdAt', 'updatedAt'];

// Objeto exportado repositorio Etiquetas
export default {
  // Obtiene todas etiquetas, filtro LIKE por keyword
  async findAll({ keyword = null } = {}) {
    const where = {};
    if (keyword && keyword.trim().length > 0) {
      where.nombre = { [Op.like]: `%${keyword.trim()}%` };
    }
    const rows = await Tag.findAll({
      attributes: DEFAULT_ATTRIBUTES,
      where,
      order: [
        ['nombre', 'ASC'],
      ],
    });
    return rows;
  },

  // Busca etiqueta por ID con atributos por defecto
  async findById(id) {
    if (!id) return null;
    const row = await Tag.findByPk(id, { attributes: DEFAULT_ATTRIBUTES });
    return row;
  },

  // Crea etiqueta y devuelve registro creado
  async create(payload) {
    const row = await Tag.create(payload);
    return this.findById(row.id);
  },

  // Actualiza etiqueta existente por ID
  async update(id, payload) {
    const row = await this.findById(id);
    if (!row) return null;
    await row.update(payload);
    return this.findById(id);
  },

  // Elimina etiqueta por ID, devuelve 1 ok / 0 no existe
  async remove(id) {
    const row = await Tag.findByPk(id);
    if (!row) return 0;
    await row.destroy();
    return 1;
  },

  // Cuenta etiquetas por nombre exacto
  async countByName(nombre) {
    const n = String(nombre || '').trim();
    if (!n) return 0;
    return Tag.count({ where: { nombre: n } });
  },

  // Cuenta etiquetas por nombre excluyendo ID dado
  async countByNameExcludingId(nombre, excludeId) {
    const n = String(nombre || '').trim();
    if (!n) return 0;
    const where = { nombre: n };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return Tag.count({ where });
  },
};
