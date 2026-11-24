/**
 * STUDIA - Modelo de recursos educativos
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS (pool.execute con
 * marcadores ?). El catalogo de recursos es GLOBAL: no pertenece a un
 * estudiante concreto. `created_by` solo registra el administrador que publico
 * el recurso y la gestion (alta, edicion y borrado) es exclusiva del admin.
 */

import { pool } from '../config/database.js';

const COLUMNS = [
  'id',
  'created_by AS createdBy',
  'title',
  'description',
  'resource_type AS resourceType',
  'url',
  'provider',
  'area',
  'difficulty_level AS difficultyLevel',
  'language',
  'is_published AS isPublished',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

/** Convierte un booleano a 1/0 para la columna TINYINT(1) `is_published`. */
const toTinyInt = (value) => (value ? 1 : 0);

/** Crea un recurso publicado por el administrador indicado. */
export const create = async (createdBy, data) => {
  const [result] = await pool.execute(
    `INSERT INTO educational_resources
       (created_by, title, description, resource_type, url, provider, area, difficulty_level, language, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      createdBy,
      data.title,
      data.description ?? null,
      data.resourceType ?? 'link',
      data.url,
      data.provider ?? null,
      data.area ?? null,
      data.difficultyLevel ?? 'medium',
      data.language ?? 'es',
      data.isPublished === undefined ? 1 : toTinyInt(data.isPublished),
    ]
  );
  return result.insertId;
};

/** Busca un recurso por id. */
export const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM educational_resources WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Lista recursos con paginacion.
 * `publishedOnly` = true -> solo los publicados (lo que ve un estudiante).
 * Con `publishedOnly` = false (administrador) devuelve publicados y ocultos.
 */
export const list = async ({
  publishedOnly = false,
  resourceType,
  area,
  search,
  limit = 20,
  offset = 0,
}) => {
  const conditions = [];
  const params = [];

  if (publishedOnly) {
    conditions.push('is_published = 1');
  }
  if (resourceType) {
    conditions.push('resource_type = ?');
    params.push(resourceType);
  }
  if (area) {
    conditions.push('area = ?');
    params.push(area);
  }
  if (search) {
    conditions.push('title LIKE ?');
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM educational_resources ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM educational_resources ${where}`,
    params
  );

  return { rows, total };
};

/** Columnas que el cliente puede modificar (lista blanca). */
const UPDATABLE = {
  title: 'title',
  description: 'description',
  resourceType: 'resource_type',
  url: 'url',
  provider: 'provider',
  area: 'area',
  difficultyLevel: 'difficulty_level',
  language: 'language',
  isPublished: 'is_published',
};

/** Actualiza un recurso. Solo se aplican los campos presentes en `data`. */
export const update = async (id, data) => {
  const assignments = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (data[key] !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(key === 'isPublished' ? toTinyInt(data[key]) : data[key]);
    }
  }
  if (!assignments.length) return 0;

  params.push(id);
  const [result] = await pool.execute(
    `UPDATE educational_resources SET ${assignments.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
};

/** Elimina un recurso del catalogo. */
export const remove = async (id) => {
  const [result] = await pool.execute('DELETE FROM educational_resources WHERE id = ?', [id]);
  return result.affectedRows;
};

export default { create, findById, list, update, remove };
