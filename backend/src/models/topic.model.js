/**
 * STUDIA - Modelo de temas
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS (pool.execute con
 * marcadores ?). El dueño de cada tema es `user_id` y debe coincidir con el
 * dueño de la materia a la que pertenece.
 *
 * Las operaciones de escritura incluyen SIEMPRE el dueño en el WHERE cuando
 * `ownerUserId` no es null, de modo que aunque se colara un id ajeno la
 * sentencia no afectaria a la fila de otro estudiante. Solo el administrador
 * (que pasa ownerUserId = null) puede operar sobre cualquier fila.
 */

import { pool } from '../config/database.js';

const COLUMNS = [
  'id',
  'subject_id AS subjectId',
  'user_id AS userId',
  'name',
  'description',
  'difficulty_level AS difficultyLevel',
  'priority',
  'status',
  'progress_percent AS progressPercent',
  'estimated_minutes AS estimatedMinutes',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

/** Crea un tema para el usuario indicado. */
export const create = async (userId, data) => {
  const [result] = await pool.execute(
    `INSERT INTO topics
       (subject_id, user_id, name, description, difficulty_level, priority, status, progress_percent, estimated_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.subjectId,
      userId,
      data.name,
      data.description ?? null,
      data.difficultyLevel ?? 'medium',
      data.priority ?? 3,
      data.status ?? 'pending',
      data.progressPercent ?? 0,
      data.estimatedMinutes ?? null,
    ]
  );
  return result.insertId;
};

/** Busca un tema por id. */
export const findById = async (id) => {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM topics WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

/**
 * Lista temas con paginacion.
 * Si `userId` es null (administrador) devuelve los de todos los estudiantes.
 */
export const list = async ({ userId = null, subjectId, status, search, limit = 20, offset = 0 }) => {
  const conditions = [];
  const params = [];

  if (userId !== null) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (subjectId) {
    conditions.push('subject_id = ?');
    params.push(subjectId);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('name LIKE ?');
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM topics ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM topics ${where}`,
    params
  );

  return { rows, total };
};

/** Columnas que el cliente puede modificar (lista blanca). */
const UPDATABLE = {
  subjectId: 'subject_id',
  name: 'name',
  description: 'description',
  difficultyLevel: 'difficulty_level',
  priority: 'priority',
  status: 'status',
  progressPercent: 'progress_percent',
  estimatedMinutes: 'estimated_minutes',
};

/**
 * Actualiza un tema. `ownerUserId` = null -> el administrador puede
 * actualizar cualquier fila; con valor -> se exige que sea del dueño.
 */
export const update = async (id, data, ownerUserId = null) => {
  const assignments = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (data[key] !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(data[key]);
    }
  }
  if (!assignments.length) return 0;

  params.push(id);
  let sql = `UPDATE topics SET ${assignments.join(', ')} WHERE id = ?`;
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Elimina un tema (los recursos asociados caen en cascada). */
export const remove = async (id, ownerUserId = null) => {
  const params = [id];
  let sql = 'DELETE FROM topics WHERE id = ?';
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Cuenta cuantos temas tiene un usuario. */
export const countByUser = async (userId) => {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM topics WHERE user_id = ?',
    [userId]
  );
  return total;
};

export default { create, findById, list, update, remove, countByUser };
