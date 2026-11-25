/**
 * STUDIA - Modelo del pasaporte academico (Academic Passport)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas. El propietario de cada entrada es `user_id`.
 *
 * El pasaporte es HIBRIDO:
 *   - Entradas manuales (tabla `passport_entries`): habilidades, proyectos,
 *     certificaciones y logros que el estudiante documenta.
 *   - Bloque automatico: progreso academico REAL agregado desde MySQL
 *     (sesiones, temas dominados, errores superados, tarjetas, tareas...).
 * Los distintivos (badges) se derivan de esas metricas reales, nunca de datos
 * inventados.
 */

import { pool } from '../config/database.js';

const ENTRY_COLUMNS = [
  'id',
  'user_id AS userId',
  'entry_type AS entryType',
  'title',
  'description',
  'category',
  'level',
  'link',
  'date_completed AS dateCompleted',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

const ENTRY_TYPES = ['skill', 'project', 'certification', 'achievement'];

/** Crea una entrada manual del pasaporte. */
export const create = async (userId, data) => {
  const [result] = await pool.execute(
    `INSERT INTO passport_entries
       (user_id, entry_type, title, description, category, level, link, date_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      ENTRY_TYPES.includes(data.entryType) ? data.entryType : 'skill',
      data.title,
      data.description ?? null,
      data.category ?? null,
      data.level ?? null,
      data.link ?? null,
      data.dateCompleted ?? null,
    ]
  );
  return findById(result.insertId);
};

/** Busca una entrada por id. */
export const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${ENTRY_COLUMNS} FROM passport_entries WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/** Lista las entradas del estudiante, opcionalmente por tipo. */
export const list = async (userId, { entryType } = {}) => {
  const conditions = ['user_id = ?'];
  const params = [userId];
  if (entryType && ENTRY_TYPES.includes(entryType)) {
    conditions.push('entry_type = ?');
    params.push(entryType);
  }
  const [rows] = await pool.execute(
    `SELECT ${ENTRY_COLUMNS}
       FROM passport_entries
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(date_completed, DATE(created_at)) DESC, id DESC`,
    params
  );
  return rows;
};

/** Columnas editables (lista blanca). */
const UPDATABLE = {
  entryType: 'entry_type',
  title: 'title',
  description: 'description',
  category: 'category',
  level: 'level',
  link: 'link',
  dateCompleted: 'date_completed',
};

/** Actualiza una entrada asegurando la propiedad (anti-IDOR). */
export const update = async (id, userId, data) => {
  const assignments = [];
  const params = [];
  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (data[key] === undefined) continue;
    if (key === 'entryType' && !ENTRY_TYPES.includes(data.entryType)) continue;
    assignments.push(`${column} = ?`);
    params.push(data[key]);
  }
  if (!assignments.length) return findById(id);

  params.push(id, userId);
  await pool.execute(
    `UPDATE passport_entries SET ${assignments.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );
  return findById(id);
};

/** Elimina una entrada asegurando la propiedad. */
export const remove = async (id, userId) => {
  const [result] = await pool.execute(
    `DELETE FROM passport_entries WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

/** Agrega el progreso academico real del estudiante. */
const getAutomaticProgress = async (userId) => {
  const [[row]] = await pool.execute(
    `SELECT
       (SELECT COALESCE(SUM(duration_minutes), 0) FROM study_sessions WHERE user_id = ? AND ended_at IS NOT NULL) AS studyMinutes,
       (SELECT COUNT(*) FROM study_sessions WHERE user_id = ? AND ended_at IS NOT NULL) AS sessions,
       (SELECT COUNT(*) FROM subjects WHERE user_id = ?) AS subjects,
       (SELECT COUNT(*) FROM topics WHERE user_id = ?) AS topicsTotal,
       (SELECT COUNT(*) FROM topics WHERE user_id = ? AND status = 'mastered') AS topicsMastered,
       (SELECT COUNT(*) FROM errors WHERE user_id = ?) AS errorsTotal,
       (SELECT COUNT(*) FROM errors WHERE user_id = ? AND status IN ('understood','resolved')) AS errorsResolved,
       (SELECT COUNT(*) FROM flashcards WHERE user_id = ?) AS flashcardsTotal,
       (SELECT COUNT(*) FROM flashcards WHERE user_id = ? AND status = 'mastered') AS flashcardsMastered,
       (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'completed') AS tasksCompleted,
       (SELECT COUNT(*) FROM exercises WHERE user_id = ?) AS exercisesCreated,
       (SELECT COUNT(*) FROM exercise_attempts WHERE user_id = ? AND is_correct IS NOT NULL) AS gradedAttempts,
       (SELECT COUNT(*) FROM exercise_attempts WHERE user_id = ? AND is_correct = 1) AS correctAttempts`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
  );

  const graded = Number(row?.gradedAttempts || 0);
  const correct = Number(row?.correctAttempts || 0);

  return {
    studyMinutes: Number(row?.studyMinutes || 0),
    studyHours: Math.round(((row?.studyMinutes || 0) / 60) * 10) / 10,
    sessions: Number(row?.sessions || 0),
    subjects: Number(row?.subjects || 0),
    topicsTotal: Number(row?.topicsTotal || 0),
    topicsMastered: Number(row?.topicsMastered || 0),
    errorsTotal: Number(row?.errorsTotal || 0),
    errorsResolved: Number(row?.errorsResolved || 0),
    flashcardsTotal: Number(row?.flashcardsTotal || 0),
    flashcardsMastered: Number(row?.flashcardsMastered || 0),
    tasksCompleted: Number(row?.tasksCompleted || 0),
    exercisesCreated: Number(row?.exercisesCreated || 0),
    gradedAttempts: graded,
    correctAttempts: correct,
    accuracy: graded > 0 ? Math.round((correct / graded) * 100) : null,
  };
};

/** Distintivos derivados de metricas reales (regla -> cumplida o no). */
const buildBadges = (progress) => {
  const rules = [
    { id: 'first_block', label: 'Primer bloque de estudio', icon: 'clock', earned: progress.studyMinutes > 0 },
    { id: 'ten_hours', label: '10 horas de estudio', icon: 'clock', earned: progress.studyMinutes >= 600 },
    { id: 'fifty_hours', label: '50 horas de estudio', icon: 'clock', earned: progress.studyMinutes >= 3000 },
    { id: 'first_mastery', label: 'Primer tema dominado', icon: 'check', earned: progress.topicsMastered >= 1 },
    { id: 'ten_mastery', label: '10 temas dominados', icon: 'award', earned: progress.topicsMastered >= 10 },
    { id: 'error_hunter', label: '5 errores superados', icon: 'shield', earned: progress.errorsResolved >= 5 },
    { id: 'memory_builder', label: '10 tarjetas dominadas', icon: 'layers', earned: progress.flashcardsMastered >= 10 },
    { id: 'task_finisher', label: '10 tareas completadas', icon: 'checkSquare', earned: progress.tasksCompleted >= 10 },
    {
      id: 'sharp_shooter',
      label: 'Precision del 80%',
      icon: 'target',
      earned: progress.accuracy !== null && progress.accuracy >= 80 && progress.gradedAttempts >= 10,
    },
  ];
  return rules;
};

/**
 * Pasaporte completo: identidad + entradas manuales + progreso automatico +
 * distintivos.
 * @param {number} userId
 */
export const getPassport = async (userId) => {
  const [entries, progress] = await Promise.all([list(userId), getAutomaticProgress(userId)]);

  const skills = entries.filter((entry) => entry.entryType === 'skill');
  const projects = entries.filter((entry) => entry.entryType === 'project');
  const certifications = entries.filter((entry) => entry.entryType === 'certification');
  const achievements = entries.filter((entry) => entry.entryType === 'achievement');

  return {
    entries,
    skills,
    projects,
    certifications,
    achievements,
    counts: {
      skills: skills.length,
      projects: projects.length,
      certifications: certifications.length,
      achievements: achievements.length,
    },
    academic: progress,
    badges: buildBadges(progress),
    badgesEarned: buildBadges(progress).filter((badge) => badge.earned).length,
  };
};

export default { create, findById, list, update, remove, getPassport, getAutomaticProgress, ENTRY_TYPES };
