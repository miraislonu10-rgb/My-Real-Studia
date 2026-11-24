/**
 * STUDIA - Modelo de ejercicios de practica
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS (pool.execute con
 * marcadores ?). El dueño de cada ejercicio es `user_id`.
 *
 * Las operaciones de escritura incluyen SIEMPRE el dueño en el WHERE cuando
 * `ownerUserId` no es null, de modo que aunque se colara un id ajeno la
 * sentencia no afectaria a la fila de otro estudiante. Solo el administrador
 * (que pasa ownerUserId = null) puede operar sobre cualquier fila.
 *
 * La columna `options` es de tipo JSON: al ESCRIBIR se serializa con
 * JSON.stringify para no grabar "[object Object]"; al LEER, mysql2 ya la
 * devuelve como objeto/array ya parseado, por lo que no se vuelve a parsear.
 */

import { pool } from '../config/database.js';

const COLUMNS = [
  'id',
  'user_id AS userId',
  'subject_id AS subjectId',
  'topic_id AS topicId',
  'title',
  'statement',
  'exercise_type AS exerciseType',
  'difficulty_level AS difficultyLevel',
  'source',
  'options',
  'correct_answer AS correctAnswer',
  'solution',
  'time_limit_seconds AS timeLimitSeconds',
  'is_active AS isActive',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

/** Serializa las `options` a JSON; null/undefined se guardan como NULL. */
const serializeOptions = (value) =>
  value === undefined || value === null ? null : JSON.stringify(value);

/** Normaliza is_active a 1/0 (acepta booleano o 0/1). */
const toActiveValue = (value) => (value ? 1 : 0);

/** Crea un ejercicio para el usuario indicado. */
export const create = async (userId, data) => {
  const [result] = await pool.execute(
    `INSERT INTO exercises
       (user_id, subject_id, topic_id, title, statement, exercise_type, difficulty_level,
        source, options, correct_answer, solution, time_limit_seconds, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.subjectId,
      data.topicId ?? null,
      data.title,
      data.statement,
      data.exerciseType ?? 'open_answer',
      data.difficultyLevel ?? 'medium',
      data.source ?? null,
      serializeOptions(data.options),
      data.correctAnswer ?? null,
      data.solution ?? null,
      data.timeLimitSeconds ?? null,
      toActiveValue(data.isActive ?? true),
    ]
  );
  return result.insertId;
};

/** Busca un ejercicio por id. */
export const findById = async (id) => {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM exercises WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

/**
 * Lista ejercicios con paginacion.
 * Si `userId` es null (administrador) devuelve los de todos los estudiantes.
 */
export const list = async ({
  userId = null,
  subjectId,
  topicId,
  exerciseType,
  difficultyLevel,
  isActive,
  search,
  limit = 20,
  offset = 0,
}) => {
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
  if (topicId) {
    conditions.push('topic_id = ?');
    params.push(topicId);
  }
  if (exerciseType) {
    conditions.push('exercise_type = ?');
    params.push(exerciseType);
  }
  if (difficultyLevel) {
    conditions.push('difficulty_level = ?');
    params.push(difficultyLevel);
  }
  if (isActive !== undefined && isActive !== null) {
    conditions.push('is_active = ?');
    params.push(toActiveValue(isActive));
  }
  if (search) {
    conditions.push('title LIKE ?');
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM exercises ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM exercises ${where}`,
    params
  );

  return { rows, total };
};

/** Columnas que el cliente puede modificar (lista blanca). */
const UPDATABLE = {
  subjectId: 'subject_id',
  topicId: 'topic_id',
  title: 'title',
  statement: 'statement',
  exerciseType: 'exercise_type',
  difficultyLevel: 'difficulty_level',
  source: 'source',
  options: 'options',
  correctAnswer: 'correct_answer',
  solution: 'solution',
  timeLimitSeconds: 'time_limit_seconds',
  isActive: 'is_active',
};

/**
 * Actualiza un ejercicio. `ownerUserId` = null -> el administrador puede
 * actualizar cualquier fila; con valor -> se exige que sea del dueño.
 */
export const update = async (id, data, ownerUserId = null) => {
  const assignments = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (data[key] === undefined) continue;

    assignments.push(`${column} = ?`);
    if (key === 'options') {
      params.push(serializeOptions(data.options));
    } else if (key === 'isActive') {
      params.push(toActiveValue(data.isActive));
    } else {
      params.push(data[key]);
    }
  }
  if (!assignments.length) return 0;

  params.push(id);
  let sql = `UPDATE exercises SET ${assignments.join(', ')} WHERE id = ?`;
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Elimina un ejercicio. */
export const remove = async (id, ownerUserId = null) => {
  const params = [id];
  let sql = 'DELETE FROM exercises WHERE id = ?';
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Cuenta cuantos ejercicios tiene un usuario. */
export const countByUser = async (userId) => {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM exercises WHERE user_id = ?',
    [userId]
  );
  return total;
};

export default { create, findById, list, update, remove, countByUser };
