/**
 * STUDIA - Modelo del diario de errores (Error Journal)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas con mysql2 (pool.execute).
 * El dueño de cada error es `user_id`.
 *
 * Clasificaciones solicitadas:
 *   - Tipo de error: Conceptuales (conceptual), Procedimentales (procedural),
 *     Calculo (calculation), Interpretacion (interpretation), Memoria (memory).
 *   - Estado de revision: Pendiente (pending), En revision (in_review), Comprendido (understood).
 */

import { pool } from '../config/database.js';

const ERROR_COLUMNS = [
  'e.id',
  'e.user_id AS userId',
  'e.subject_id AS subjectId',
  'e.topic_id AS topicId',
  'e.exercise_id AS exerciseId',
  'e.exercise_title AS exerciseTitle',
  'e.title',
  'e.description',
  'e.user_answer AS userAnswer',
  'e.correct_answer AS correctAnswer',
  'e.explanation',
  'e.error_type AS errorType',
  'e.severity',
  'e.status',
  'e.error_date AS errorDate',
  'e.root_cause AS rootCause',
  'e.correction_notes AS correctionNotes',
  'e.review_count AS reviewCount',
  'e.last_reviewed_at AS lastReviewedAt',
  'e.resolved_at AS resolvedAt',
  'e.created_at AS createdAt',
  'e.updated_at AS updatedAt',
  'sub.name AS subjectName',
  'sub.color AS subjectColor',
  'top.name AS topicName',
].join(', ');

/** Normaliza el estado de revision para la base de datos */
const normalizeStatus = (status) => {
  if (status === 'comprendido' || status === 'understood' || status === 'resolved') return 'understood';
  if (status === 'en_revision' || status === 'in_review') return 'in_review';
  return 'pending';
};

/** Normaliza el tipo de error */
const normalizeErrorType = (type) => {
  const map = {
    conceptual: 'conceptual',
    conceptuales: 'conceptual',
    procedural: 'procedural',
    procedimentales: 'procedural',
    calculation: 'calculation',
    calculo: 'calculation',
    cálculo: 'calculation',
    interpretation: 'interpretation',
    interpretacion: 'interpretation',
    interpretación: 'interpretation',
    memory: 'memory',
    memoria: 'memory',
  };
  return map[String(type).toLowerCase()] || 'conceptual';
};

/**
 * Crea un nuevo registro en el diario de errores.
 */
export const create = async (userId, data) => {
  const status = normalizeStatus(data.status);
  const errorType = normalizeErrorType(data.errorType);
  const title = (data.title || data.exerciseTitle || 'Error en ejercicio').slice(0, 200);

  const [result] = await pool.execute(
    `INSERT INTO errors
       (user_id, subject_id, topic_id, exercise_id, exercise_title, title, description,
        user_answer, correct_answer, explanation, error_type, status, error_date,
        severity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE()), ?, UTC_TIMESTAMP())`,
    [
      userId,
      data.subjectId ?? null,
      data.topicId ?? null,
      data.exerciseId ?? null,
      data.exerciseTitle ?? null,
      title,
      data.description ?? data.explanation ?? null,
      data.userAnswer ?? null,
      data.correctAnswer ?? null,
      data.explanation ?? null,
      errorType,
      status,
      data.errorDate ?? null,
      data.severity ?? 'medium',
    ]
  );

  return findById(result.insertId);
};

/**
 * Busca un error por su ID.
 */
export const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${ERROR_COLUMNS}
       FROM errors e
       LEFT JOIN subjects sub ON sub.id = e.subject_id
       LEFT JOIN topics top ON top.id = e.topic_id
      WHERE e.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Actualiza los datos de un error existente.
 */
export const update = async (id, userId, data) => {
  const current = await findById(id);
  if (!current) return null;

  const status = data.status ? normalizeStatus(data.status) : current.status;
  const errorType = data.errorType ? normalizeErrorType(data.errorType) : current.errorType;
  const title = (data.title || data.exerciseTitle || current.title).slice(0, 200);
  const isResolved = status === 'understood' || status === 'resolved';

  await pool.execute(
    `UPDATE errors
        SET subject_id = ?,
            topic_id = ?,
            exercise_id = ?,
            exercise_title = ?,
            title = ?,
            description = ?,
            user_answer = ?,
            correct_answer = ?,
            explanation = ?,
            error_type = ?,
            status = ?,
            error_date = COALESCE(?, error_date),
            severity = COALESCE(?, severity),
            resolved_at = CASE WHEN ? = 1 THEN COALESCE(resolved_at, UTC_TIMESTAMP()) ELSE NULL END,
            last_reviewed_at = UTC_TIMESTAMP(),
            review_count = review_count + 1
      WHERE id = ? AND user_id = ?`,
    [
      data.subjectId !== undefined ? data.subjectId : current.subjectId,
      data.topicId !== undefined ? data.topicId : current.topicId,
      data.exerciseId !== undefined ? data.exerciseId : current.exerciseId,
      data.exerciseTitle !== undefined ? data.exerciseTitle : current.exerciseTitle,
      title,
      data.description ?? data.explanation ?? current.description,
      data.userAnswer !== undefined ? data.userAnswer : current.userAnswer,
      data.correctAnswer !== undefined ? data.correctAnswer : current.correctAnswer,
      data.explanation !== undefined ? data.explanation : current.explanation,
      errorType,
      status,
      data.errorDate ?? null,
      data.severity ?? null,
      isResolved ? 1 : 0,
      id,
      userId,
    ]
  );

  return findById(id);
};

/**
 * Actualiza de forma rapida el estado de revision del error:
 * 'pending', 'in_review', 'understood'.
 */
export const updateStatus = async (id, userId, newStatus) => {
  const status = normalizeStatus(newStatus);
  const isResolved = status === 'understood';

  await pool.execute(
    `UPDATE errors
        SET status = ?,
            last_reviewed_at = UTC_TIMESTAMP(),
            resolved_at = CASE WHEN ? = 1 THEN UTC_TIMESTAMP() ELSE NULL END,
            review_count = review_count + 1
      WHERE id = ? AND user_id = ?`,
    [status, isResolved ? 1 : 0, id, userId]
  );

  return findById(id);
};

/**
 * Elimina un registro de error asegurando propiedad (anti-IDOR).
 */
export const remove = async (id, userId) => {
  const [result] = await pool.execute(
    `DELETE FROM errors WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

/**
 * Lista errores con filtros, busqueda de texto y paginacion.
 */
export const list = async ({
  userId,
  subjectId,
  errorType,
  status,
  search,
  from,
  to,
  limit = 20,
  offset = 0,
}) => {
  const conditions = [];
  const params = [];

  if (userId !== null && userId !== undefined) {
    conditions.push('e.user_id = ?');
    params.push(userId);
  }

  if (subjectId) {
    conditions.push('e.subject_id = ?');
    params.push(subjectId);
  }

  if (errorType) {
    conditions.push('e.error_type = ?');
    params.push(normalizeErrorType(errorType));
  }

  if (status) {
    conditions.push('e.status = ?');
    params.push(normalizeStatus(status));
  }

  if (from) {
    conditions.push('(e.error_date >= ? OR (e.error_date IS NULL AND e.created_at >= ?))');
    params.push(from, from);
  }

  if (to) {
    conditions.push('(e.error_date <= ? OR (e.error_date IS NULL AND e.created_at <= ?))');
    params.push(to, to);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      `(e.exercise_title LIKE ? OR e.title LIKE ? OR e.explanation LIKE ? OR e.user_answer LIKE ? OR e.correct_answer LIKE ? OR top.name LIKE ? OR sub.name LIKE ?)`
    );
    params.push(term, term, term, term, term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM errors e
       LEFT JOIN subjects sub ON sub.id = e.subject_id
       LEFT JOIN topics top ON top.id = e.topic_id
       ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `SELECT ${ERROR_COLUMNS}
       FROM errors e
       LEFT JOIN subjects sub ON sub.id = e.subject_id
       LEFT JOIN topics top ON top.id = e.topic_id
       ${whereClause}
      ORDER BY COALESCE(e.error_date, DATE(e.created_at)) DESC, e.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
};

/**
 * Estadisticas y desglose de errores del estudiante.
 */
export const getStats = async (userId) => {
  const [[counts]] = await pool.execute(
    `SELECT 
       COUNT(*) AS totalErrors,
       SUM(CASE WHEN status IN ('pending', 'open') THEN 1 ELSE 0 END) AS pendingCount,
       SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS inReviewCount,
       SUM(CASE WHEN status IN ('understood', 'resolved') THEN 1 ELSE 0 END) AS understoodCount
      FROM errors
     WHERE user_id = ?`,
    [userId]
  );

  const [byTypeRows] = await pool.execute(
    `SELECT error_type AS errorType, COUNT(*) AS count
       FROM errors
      WHERE user_id = ?
      GROUP BY error_type`,
    [userId]
  );

  const byType = {
    conceptual: 0,
    procedural: 0,
    calculation: 0,
    interpretation: 0,
    memory: 0,
  };

  byTypeRows.forEach((row) => {
    const key = row.errorType;
    if (byType[key] !== undefined) {
      byType[key] = Number(row.count || 0);
    }
  });

  return {
    total: Number(counts?.totalErrors || 0),
    pending: Number(counts?.pendingCount || 0),
    inReview: Number(counts?.inReviewCount || 0),
    understood: Number(counts?.understoodCount || 0),
    byType,
  };
};
