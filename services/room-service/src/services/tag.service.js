import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.util.js';
import TagRepository from '../repositories/tag.repository.js';

const NOMBRE_MAX_LEN = 100;

// Limpia y valida payload etiqueta (nombre único)
async function sanitizePayload(payload, { excludeId = null } = {}) {
  if (!payload) throw new BadRequestError('Payload inválido');
  const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim() : '';
  if (!nombre) throw new BadRequestError('El nombre de la etiqueta es requerido');
  if (nombre.length > NOMBRE_MAX_LEN) {
    throw new BadRequestError(`El nombre de la etiqueta supera el máximo de ${NOMBRE_MAX_LEN} caracteres`);
  }
  const duplicateCount = await TagRepository.countByNameExcludingId(nombre, excludeId);
  if (duplicateCount > 0) {
    throw new ConflictError(`Ya existe una etiqueta con el nombre "${nombre}"`);
  }
  const descripcion = typeof payload.descripcion === 'string' ? payload.descripcion.trim() : null;
  return {
    nombre,
    descripcion: descripcion && descripcion.length > 0 ? descripcion : null,
  };
}

// Obtiene todas las etiquetas, opcional filtro keyword (sin paginar, para TagSelector)
async function getAll({ keyword } = {}) {
  const rows = await TagRepository.findAll({ keyword });
  return rows.map((r) => r.get({ plain: true }));
}

// Obtiene etiquetas paginadas + metadatos (para tabla Dashboard Admin)
async function getAllPaginated({ keyword, page, limit } = {}) {
  const result = await TagRepository.findAndCountAllPaginated({ keyword, page, limit });
  const totalItems = Number(result.count) || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / result.limit));
  return {
    items: result.rows.map((r) => r.get({ plain: true })),
    meta: {
      total: totalItems,
      page: result.page,
      perPage: result.limit,
      totalPages,
      hasNextPage: result.page < totalPages,
      hasPrevPage: result.page > 1,
    },
  };
}

// Obtiene etiqueta por ID o lanza 404
async function getById(id) {
  const row = await TagRepository.findById(id);
  if (!row) throw new NotFoundError('Etiqueta no encontrada');
  return row.get({ plain: true });
}

// Crea nueva etiqueta tras sanitizar
async function create(payload) {
  const clean = await sanitizePayload(payload);
  const row = await TagRepository.create(clean);
  return row.get({ plain: true });
}

// Actualiza etiqueta existente tras sanitizar
async function update(id, payload) {
  const existing = await TagRepository.findById(id);
  if (!existing) throw new NotFoundError('Etiqueta no encontrada');
  const clean = await sanitizePayload(payload, { excludeId: id });
  const updated = await TagRepository.update(id, clean);
  return updated.get({ plain: true });
}

// Elimina etiqueta por ID, lanza 404 si no existe
async function remove(id) {
  const existing = await TagRepository.findById(id);
  if (!existing) throw new NotFoundError('Etiqueta no encontrada');
  await TagRepository.remove(id);
  return true;
}

// Objeto exportado servicio Etiquetas
export default {
  getAll,
  getAllPaginated,
  getById,
  create,
  update,
  remove,
};
