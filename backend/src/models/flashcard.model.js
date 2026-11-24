/**
 * STUDIA - Modelo de tarjetas de memoria (Memory Lab — SM-2)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas con mysql2 (pool.execute).
 *
 * ALGORITMO SUPERMEMO 2 (SM-2):
 *   Modela la curva del olvido ajustando dinámicamente el factor de facilidad
 *   (ease_factor) y el intervalo en días (interval_days) a partir de la
 *   calificación de comprensión del estudiante (rating 0-5).
 */

import { pool } from '../config/database.js';

const FLASHCARD_COLUMNS = [
  'f.id',
  'f.user_id AS userId',
  'f.subject_id AS subjectId',
  'f.topic_id AS topicId',
  'f.error_id AS errorId',
  'f.front_text AS frontText',
  'f.back_text AS backText',
  'f.hint',
  'f.difficulty_level AS difficultyLevel',
  'f.status',
  'f.source',
  'f.ease_factor AS easeFactor',
  'f.interval_days AS intervalDays',
  'f.repetitions',
  'f.lapses',
  'f.last_reviewed_at AS lastReviewedAt',
  'f.next_review_at AS nextReviewAt',
  'f.created_at AS createdAt',
  'f.updated_at AS updatedAt',
  'sub.name AS subjectName',
  'sub.color AS subjectColor',
  'top.name AS topicName',
].join(', ');

/** Busca una tarjeta por ID */
export const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${FLASHCARD_COLUMNS}
       FROM flashcards f
       LEFT JOIN subjects sub ON sub.id = f.subject_id
       LEFT JOIN topics top ON top.id = f.topic_id
      WHERE f.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/** Crea una nueva tarjeta de memoria */
export const create = async (userId, data) => {
  const [result] = await pool.execute(
    `INSERT INTO flashcards
       (user_id, subject_id, topic_id, error_id, front_text, back_text, hint,
        difficulty_level, status, source, ease_factor, interval_days, repetitions, lapses,
        next_review_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, 2.50, 0, 0, 0, UTC_TIMESTAMP())`,
    [
      userId,
      data.subjectId ?? null,
      data.topicId ?? null,
      data.errorId ?? null,
      data.frontText,
      data.backText,
      data.hint ?? null,
      data.difficultyLevel ?? 'medium',
      data.source ?? 'manual',
    ]
  );
  return findById(result.insertId);
};

/** Actualiza una tarjeta */
export const update = async (id, userId, data) => {
  const current = await findById(id);
  if (!current || current.userId !== userId) return null;

  await pool.execute(
    `UPDATE flashcards
        SET subject_id = ?,
            topic_id = ?,
            front_text = ?,
            back_text = ?,
            hint = ?,
            difficulty_level = ?
      WHERE id = ? AND user_id = ?`,
    [
      data.subjectId !== undefined ? data.subjectId : current.subjectId,
      data.topicId !== undefined ? data.topicId : current.topicId,
      data.frontText ?? current.frontText,
      data.backText ?? current.backText,
      data.hint !== undefined ? data.hint : current.hint,
      data.difficultyLevel ?? current.difficultyLevel,
      id,
      userId,
    ]
  );
  return findById(id);
};

/** Elimina una tarjeta */
export const remove = async (id, userId) => {
  const [result] = await pool.execute(
    `DELETE FROM flashcards WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

/** Lista tarjetas con filtros y paginación */
export const list = async ({
  userId,
  subjectId,
  topicId,
  status,
  search,
  limit = 20,
  offset = 0,
}) => {
  const conditions = ['f.user_id = ?'];
  const params = [userId];

  if (subjectId) {
    conditions.push('f.subject_id = ?');
    params.push(subjectId);
  }
  if (topicId) {
    conditions.push('f.topic_id = ?');
    params.push(topicId);
  }
  if (status) {
    conditions.push('f.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(f.front_text LIKE ? OR f.back_text LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await pool.execute(
    `SELECT ${FLASHCARD_COLUMNS}
       FROM flashcards f
       LEFT JOIN subjects sub ON sub.id = f.subject_id
       LEFT JOIN topics top ON top.id = f.topic_id
       ${where}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM flashcards f ${where}`,
    params
  );

  return { rows, total };
};

/** Obtiene tarjetas pendientes de repaso para hoy */
export const getPendingReview = async (userId, limit = 50) => {
  const [rows] = await pool.execute(
    `SELECT ${FLASHCARD_COLUMNS}
       FROM flashcards f
       LEFT JOIN subjects sub ON sub.id = f.subject_id
       LEFT JOIN topics top ON top.id = f.topic_id
      WHERE f.user_id = ?
        AND (f.next_review_at IS NULL OR f.next_review_at <= UTC_TIMESTAMP() OR f.status = 'new')
      ORDER BY (f.status = 'new') DESC, f.next_review_at ASC
      LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

/**
 * Registra una respuesta y evalúa el nivel de comprensión aplicando el algoritmo SM-2:
 * @param {number} id ID de la tarjeta
 * @param {number} userId ID del estudiante
 * @param {number} rating Calificación de comprensión (0-5):
 *   0: Olvido total
 *   1: Incorrecto, pero familiar
 *   2: Incorrecto con esfuerzo
 *   3: Correcto con dificultad
 *   4: Correcto tras vacilación
 *   5: Recuerdo perfecto
 */
export const review = async (id, userId, rating, timeTakenSeconds = null) => {
  const card = await findById(id);
  if (!card || card.userId !== userId) return null;

  const score = Math.min(5, Math.max(0, Number(rating)));
  let easeFactor = Number(card.easeFactor) || 2.50;
  let intervalDays = Number(card.intervalDays) || 0;
  let repetitions = Number(card.repetitions) || 0;
  let lapses = Number(card.lapses) || 0;
  let status = 'review';

  if (score < 3) {
    // Fallo: reiniciar intervalo a 1 día y contar lapse
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
    status = 'learning';
  } else {
    // Acierto: calcular nuevo intervalo
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }

    // Actualizar factor de facilidad (SM-2 standard formula)
    easeFactor = easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
    easeFactor = Math.min(5.00, Math.max(1.30, easeFactor));
    repetitions += 1;
    status = repetitions >= 4 ? 'mastered' : 'review';
  }

  // 1. Actualizar la tarjeta en MySQL
  await pool.execute(
    `UPDATE flashcards
        SET ease_factor = ?,
            interval_days = ?,
            repetitions = ?,
            lapses = ?,
            status = ?,
            last_reviewed_at = UTC_TIMESTAMP(),
            next_review_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)
      WHERE id = ? AND user_id = ?`,
    [easeFactor, intervalDays, repetitions, lapses, status, intervalDays, id, userId]
  );

  // 2. Registrar en la tabla de historial de repasos
  try {
    await pool.execute(
      `INSERT INTO flashcard_reviews
         (flashcard_id, user_id, rating, review_date, scheduled_interval, ease_factor, time_taken_seconds)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?)`,
      [id, userId, score, intervalDays, easeFactor, timeTakenSeconds ?? null]
    );
  } catch (err) {
    console.warn('[flashcard] No se pudo insertar en flashcard_reviews:', err.message);
  }

  return findById(id);
};

/** Historial de repasos del estudiante */
export const getReviewHistory = async (userId, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT r.id, r.flashcard_id AS flashcardId, r.rating, r.review_date AS reviewDate,
            r.scheduled_interval AS scheduledInterval, r.ease_factor AS easeFactor,
            f.front_text AS frontText, f.back_text AS backText,
            sub.name AS subjectName, sub.color AS subjectColor
       FROM flashcard_reviews r
       JOIN flashcards f ON f.id = r.flashcard_id
       LEFT JOIN subjects sub ON sub.id = f.subject_id
      WHERE r.user_id = ?
      ORDER BY r.review_date DESC
      LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

/** Resumen de métricas para Memory Lab */
export const getStats = async (userId) => {
  const [[counts]] = await pool.execute(
    `SELECT 
       COUNT(*) AS totalCards,
       SUM(CASE WHEN next_review_at <= UTC_TIMESTAMP() OR status = 'new' THEN 1 ELSE 0 END) AS pendingReview,
       SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) AS masteredCards,
       SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) AS learningCards
      FROM flashcards
     WHERE user_id = ?`,
    [userId]
  );

  const [[reviewCount]] = await pool.execute(
    `SELECT COUNT(*) AS totalReviewsCompleted FROM flashcard_reviews WHERE user_id = ?`,
    [userId]
  );

  return {
    totalCards: Number(counts?.totalCards || 0),
    pendingReview: Number(counts?.pendingReview || 0),
    masteredCards: Number(counts?.masteredCards || 0),
    learningCards: Number(counts?.learningCards || 0),
    totalReviewsCompleted: Number(reviewCount?.totalReviewsCompleted || 0),
  };
};
