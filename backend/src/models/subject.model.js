/**
 * STUDIA - Modelo de materias
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS (pool.execute con
 * marcadores ?). El dueño de cada materia es `user_id`.
 *
 * Las operaciones de escritura incluyen SIEMPRE el dueño en el WHERE cuando
 * `ownerUserId` no es null, de modo que aunque se colara un id ajeno la
 * sentencia no afectaria a la fila de otro estudiante. Solo el administrador
 * (que pasa ownerUserId = null) puede operar sobre cualquier fila.
 */

import { pool } from '../config/database.js';

const COLUMNS = [
  'id',
  'user_id AS userId',
  'name',
  'code',
  'description',
  'color',
  'icon',
  'difficulty_level AS difficultyLevel',
  'teacher_name AS teacherName',
  'target_hours AS targetHours',
  'status',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

/** Crea una materia para el usuario indicado. */
export const create = async (userId, data) => {
  const [result] = await pool.execute(
    `INSERT INTO subjects
       (user_id, name, code, description, color, icon, difficulty_level, teacher_name, target_hours, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.name,
      data.code ?? null,
      data.description ?? null,
      data.color ?? null,
      data.icon ?? null,
      data.difficultyLevel ?? 'medium',
      data.teacherName ?? null,
      data.targetHours ?? null,
      data.status ?? 'active',
    ]
  );
  return result.insertId;
};

/** Busca una materia por id. */
export const findById = async (id) => {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM subjects WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

/**
 * Lista materias con paginacion.
 * Si `userId` es null (administrador) devuelve las de todos los estudiantes.
 */
export const list = async ({ userId = null, status, search, limit = 20, offset = 0 }) => {
  const conditions = [];
  const params = [];

  if (userId !== null) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(name LIKE ? OR code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM subjects ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM subjects ${where}`,
    params
  );

  return { rows, total };
};

/** Lista simple (sin paginar) de las materias de un usuario, para selectores. */
export const listOptionsByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, name, color, status FROM subjects WHERE user_id = ? ORDER BY name ASC`,
    [userId]
  );
  return rows;
};

/** Columnas que el cliente puede modificar (lista blanca). */
const UPDATABLE = {
  name: 'name',
  code: 'code',
  description: 'description',
  color: 'color',
  icon: 'icon',
  difficultyLevel: 'difficulty_level',
  teacherName: 'teacher_name',
  targetHours: 'target_hours',
  status: 'status',
};

/**
 * Actualiza una materia. `ownerUserId` = null -> el administrador puede
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
  let sql = `UPDATE subjects SET ${assignments.join(', ')} WHERE id = ?`;
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Elimina una materia (los temas y ejercicios asociados caen en cascada). */
export const remove = async (id, ownerUserId = null) => {
  const params = [id];
  let sql = 'DELETE FROM subjects WHERE id = ?';
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Cuenta cuantas materias tiene un usuario. */
export const countByUser = async (userId) => {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM subjects WHERE user_id = ?',
    [userId]
  );
  return total;
};

export default { create, findById, list, listOptionsByUser, update, remove, countByUser };
