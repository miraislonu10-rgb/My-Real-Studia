/**
 * STUDIA - Modelo del modulo de docencia (SOLO LECTURA)
 * ------------------------------------------------------------------
 * Acompana a los estudiantes sin poder alterar nada: este archivo no contiene
 * ninguna sentencia INSERT, UPDATE ni DELETE. La vista de docente es, por
 * diseno, de consulta.
 *
 * SEGURIDAD: sentencias preparadas con mysql2 (pool.execute). Lo unico
 * dinamico es la busqueda (siempre como parametro) y la ordenacion, que se
 * traduce desde una lista blanca (SORTS): un valor inesperado nunca llega al
 * SQL.
 *
 * PRINCIPIO DE DATOS HONESTOS: todas las cifras salen de MySQL. Cuando un
 * estudiante no tiene actividad se devuelve 0 o null, jamas un valor de relleno.
 *
 * Las agregaciones se calculan en tablas derivadas agrupadas por user_id para
 * evitar el producto cartesiano que produciria unir varias tablas "uno a
 * muchos" en una sola consulta.
 */

import { pool } from '../config/database.js';

/** Ordenaciones permitidas para el listado de alumnos. */
const SORTS = {
  name: 'u.last_name ASC, u.first_name ASC',
  studyTime: 'studyMinutes DESC, u.last_name ASC',
  accuracy: 'accuracyPercentage DESC, u.last_name ASC',
  progress: 'averageTopicProgress DESC, u.last_name ASC',
  inactive: 'lastSessionAt ASC, u.last_name ASC',
};

/** Ordenaciones expuestas al cliente (el resto se ignora y se usa "name"). */
export const ALLOWED_SORTS = Object.keys(SORTS);

/** El estado de un error se considera pendiente o resuelto igual que en las analiticas. */
const PENDING_ERROR_STATUSES = "('pending', 'open')";

/** Convierte a numero los campos agregados (mysql2 puede devolver cadenas). */
const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

/**
 * Columnas numericas del listado de alumnos.
 * Los campos anulables (precision y progreso) se dejan en null para poder
 * distinguir "sin datos" de "cero".
 */
const mapStudentRow = (row) => ({
  ...row,
  studyMinutes: toNumber(row.studyMinutes) || 0,
  sessions: toNumber(row.sessions) || 0,
  averageFocus: toNumber(row.averageFocus) || 0,
  subjects: toNumber(row.subjects) || 0,
  topics: toNumber(row.topics) || 0,
  topicsInProgress: toNumber(row.topicsInProgress) || 0,
  topicsNeedsReview: toNumber(row.topicsNeedsReview) || 0,
  topicsMastered: toNumber(row.topicsMastered) || 0,
  averageTopicProgress: toNumber(row.averageTopicProgress),
  exerciseAttempts: toNumber(row.exerciseAttempts) || 0,
  accuracyPercentage: toNumber(row.accuracyPercentage),
  pendingErrors: toNumber(row.pendingErrors) || 0,
  pendingTasks: toNumber(row.pendingTasks) || 0,
});

/**
 * Lista los estudiantes con su progreso agregado.
 * @param {{search?:string, sort?:string, limit:number, offset:number}} filters
 */
export const listStudents = async ({ search, sort, limit, offset }) => {
  const conditions = ["u.role = 'student'", "u.status <> 'deleted'"];
  const params = [];

  if (search) {
    conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderBy = SORTS[sort] || SORTS.name;

  const [rows] = await pool.execute(
    `SELECT u.uuid,
            u.first_name AS firstName,
            u.last_name AS lastName,
            u.email,
            u.status,
            u.created_at AS createdAt,
            u.last_login_at AS lastLoginAt,
            COALESCE(study.studyMinutes, 0) AS studyMinutes,
            COALESCE(study.sessions, 0) AS sessions,
            study.lastSessionAt,
            COALESCE(study.averageFocus, 0) AS averageFocus,
            COALESCE(subj.subjects, 0) AS subjects,
            COALESCE(tp.topics, 0) AS topics,
            COALESCE(tp.inProgress, 0) AS topicsInProgress,
            COALESCE(tp.needsReview, 0) AS topicsNeedsReview,
            COALESCE(tp.mastered, 0) AS topicsMastered,
            tp.averageTopicProgress,
            COALESCE(att.attempts, 0) AS exerciseAttempts,
            att.accuracyPercentage,
            COALESCE(err.pendingErrors, 0) AS pendingErrors,
            COALESCE(tk.pendingTasks, 0) AS pendingTasks
       FROM users u
       LEFT JOIN (
             SELECT user_id,
                    SUM(duration_minutes) AS studyMinutes,
                    COUNT(*) AS sessions,
                    MAX(started_at) AS lastSessionAt,
                    ROUND(AVG(focus_score), 1) AS averageFocus
               FROM study_sessions
              WHERE ended_at IS NOT NULL
              GROUP BY user_id
            ) study ON study.user_id = u.id
       LEFT JOIN (
             SELECT user_id, COUNT(*) AS subjects
               FROM subjects
              GROUP BY user_id
            ) subj ON subj.user_id = u.id
       LEFT JOIN (
             SELECT user_id,
                    COUNT(*) AS topics,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
                    SUM(CASE WHEN status = 'needs_review' THEN 1 ELSE 0 END) AS needsReview,
                    SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) AS mastered,
                    ROUND(AVG(progress_percent), 0) AS averageTopicProgress
               FROM topics
              GROUP BY user_id
            ) tp ON tp.user_id = u.id
       LEFT JOIN (
             SELECT user_id,
                    COUNT(*) AS attempts,
                    ROUND((SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 0) AS accuracyPercentage
               FROM exercise_attempts
              GROUP BY user_id
            ) att ON att.user_id = u.id
       LEFT JOIN (
             SELECT user_id,
                    SUM(CASE WHEN status IN ${PENDING_ERROR_STATUSES} THEN 1 ELSE 0 END) AS pendingErrors
               FROM errors
              GROUP BY user_id
            ) err ON err.user_id = u.id
       LEFT JOIN (
             SELECT user_id,
                    SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) AS pendingTasks
               FROM tasks
              GROUP BY user_id
            ) tk ON tk.user_id = u.id
       ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    params
  );

  return { rows: rows.map(mapStudentRow), total: Number(total) || 0 };
};

/**
 * Resumen del grupo: cifras agregadas de todos los estudiantes.
 */
export const getCohortSummary = async () => {
  const [[students]] = await pool.execute(
    `SELECT COUNT(*) AS totalStudents,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeAccounts,
            SUM(CASE WHEN last_login_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS loggedInThisWeek
       FROM users
      WHERE role = 'student' AND status <> 'deleted'`
  );

  const [[activity]] = await pool.execute(
    `SELECT COALESCE(SUM(ss.duration_minutes), 0) AS totalMinutes,
            COUNT(*) AS totalSessions,
            COUNT(DISTINCT ss.user_id) AS studentsWithActivity
       FROM study_sessions ss
       JOIN users u ON u.id = ss.user_id
      WHERE u.role = 'student' AND u.status <> 'deleted' AND ss.ended_at IS NOT NULL`
  );

  // Materias con mas tiempo de estudio acumulado en todo el grupo.
  const [topSubjects] = await pool.execute(
    `SELECT s.name AS subjectName,
            MAX(s.color) AS subjectColor,
            SUM(ss.duration_minutes) AS minutes,
            COUNT(DISTINCT ss.user_id) AS students
       FROM study_sessions ss
       JOIN subjects s ON s.id = ss.subject_id
       JOIN users u ON u.id = ss.user_id
      WHERE u.role = 'student' AND u.status <> 'deleted' AND ss.ended_at IS NOT NULL
      GROUP BY s.name
      ORDER BY minutes DESC
      LIMIT 5`
  );

  // Temas que el grupo tiene entre manos ahora mismo: es la foto real de
  // "que estan viendo" todos los alumnos a la vez.
  const [activeTopics] = await pool.execute(
    `SELECT t.name AS topicName,
            s.name AS subjectName,
            MAX(s.color) AS subjectColor,
            COUNT(DISTINCT t.user_id) AS students,
            ROUND(AVG(t.progress_percent), 0) AS averageProgress
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       JOIN users u ON u.id = t.user_id
      WHERE u.role = 'student' AND u.status <> 'deleted'
        AND t.status IN ('in_progress', 'needs_review')
      GROUP BY t.name, s.name
      ORDER BY students DESC, averageProgress ASC
      LIMIT 6`
  );

  return {
    students: {
      total: Number(students?.totalStudents) || 0,
      active: Number(students?.activeAccounts) || 0,
      loggedInThisWeek: Number(students?.loggedInThisWeek) || 0,
    },
    activity: {
      totalMinutes: Number(activity?.totalMinutes) || 0,
      totalSessions: Number(activity?.totalSessions) || 0,
      studentsWithActivity: Number(activity?.studentsWithActivity) || 0,
    },
    topSubjects: topSubjects.map((row) => ({
      ...row,
      minutes: Number(row.minutes) || 0,
      students: Number(row.students) || 0,
    })),
    activeTopics: activeTopics.map((row) => ({
      ...row,
      students: Number(row.students) || 0,
      averageProgress: Number(row.averageProgress) || 0,
    })),
  };
};

/**
 * Alumnos que requieren atencion: sin sesiones en los ultimos 7 dias o con
 * errores pendientes acumulados. Se excluyen las cuentas creadas hace menos de
 * una semana para no senalar a quien acaba de empezar.
 */
export const getStudentsNeedingAttention = async (limit = 5) => {
  const [rows] = await pool.execute(
    `SELECT u.uuid,
            u.first_name AS firstName,
            u.last_name AS lastName,
            act.lastSessionAt,
            COALESCE(err.pendingErrors, 0) AS pendingErrors
       FROM users u
       LEFT JOIN (
             SELECT user_id, MAX(started_at) AS lastSessionAt
               FROM study_sessions
              WHERE ended_at IS NOT NULL
              GROUP BY user_id
            ) act ON act.user_id = u.id
       LEFT JOIN (
             SELECT user_id,
                    SUM(CASE WHEN status IN ${PENDING_ERROR_STATUSES} THEN 1 ELSE 0 END) AS pendingErrors
               FROM errors
              GROUP BY user_id
            ) err ON err.user_id = u.id
      WHERE u.role = 'student'
        AND u.status = 'active'
        AND u.created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
        AND (
              act.lastSessionAt IS NULL
              OR act.lastSessionAt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
              OR COALESCE(err.pendingErrors, 0) >= 5
            )
      ORDER BY COALESCE(err.pendingErrors, 0) DESC, act.lastSessionAt ASC
      LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({ ...row, pendingErrors: Number(row.pendingErrors) || 0 }));
};

/**
 * Ficha base de un estudiante (incluye el id interno, que el servicio retira
 * antes de responder).
 */
export const findStudentByUuid = async (uuid) => {
  const [rows] = await pool.execute(
    `SELECT u.id,
            u.uuid,
            u.first_name AS firstName,
            u.last_name AS lastName,
            u.email,
            u.status,
            u.created_at AS createdAt,
            u.last_login_at AS lastLoginAt,
            p.education_level AS educationLevel,
            p.institution,
            p.academic_program AS academicProgram,
            p.grade_level AS gradeLevel,
            p.main_goal AS mainGoal,
            p.daily_goal_minutes AS dailyGoalMinutes,
            p.timezone
       FROM users u
       LEFT JOIN student_profiles p ON p.user_id = u.id
      WHERE u.uuid = ? AND u.role = 'student'
      LIMIT 1`,
    [uuid]
  );
  return rows[0] || null;
};

/** Materias del estudiante con el tiempo de estudio acumulado en cada una. */
export const getStudentSubjects = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT s.id,
            s.name,
            s.color,
            s.status,
            s.difficulty_level AS difficultyLevel,
            s.teacher_name AS teacherName,
            s.target_hours AS targetHours,
            COALESCE(SUM(ss.duration_minutes), 0) AS minutes,
            COUNT(ss.id) AS sessions
       FROM subjects s
       LEFT JOIN study_sessions ss
              ON ss.subject_id = s.id AND ss.ended_at IS NOT NULL
      WHERE s.user_id = ?
      GROUP BY s.id, s.name, s.color, s.status, s.difficulty_level, s.teacher_name, s.target_hours
      ORDER BY minutes DESC, s.name ASC`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    minutes: Number(row.minutes) || 0,
    sessions: Number(row.sessions) || 0,
    targetHours: row.targetHours === null ? null : Number(row.targetHours),
  }));
};

/**
 * Temas del estudiante ordenados por lo que esta trabajando ahora
 * (en curso, por repasar, pendiente, dominado).
 */
export const getStudentTopics = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT t.id,
            t.name,
            t.status,
            t.priority,
            t.progress_percent AS progressPercent,
            t.difficulty_level AS difficultyLevel,
            t.subject_id AS subjectId,
            s.name AS subjectName,
            s.color AS subjectColor,
            t.updated_at AS updatedAt
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
      WHERE t.user_id = ?
      ORDER BY FIELD(t.status, 'in_progress', 'needs_review', 'pending', 'mastered'),
               t.priority ASC,
               t.name ASC`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    progressPercent: Number(row.progressPercent) || 0,
    priority: Number(row.priority) || 0,
  }));
};

/** Ultimas sesiones de estudio cerradas. */
export const getStudentRecentSessions = async (userId, limit = 8) => {
  const [rows] = await pool.execute(
    `SELECT ss.id,
            ss.started_at AS startedAt,
            ss.duration_minutes AS durationMinutes,
            ss.focus_score AS focusScore,
            ss.session_type AS sessionType,
            s.name AS subjectName,
            s.color AS subjectColor,
            t.name AS topicName
       FROM study_sessions ss
       LEFT JOIN subjects s ON s.id = ss.subject_id
       LEFT JOIN topics t ON t.id = ss.topic_id
      WHERE ss.user_id = ? AND ss.ended_at IS NOT NULL
      ORDER BY ss.started_at DESC
      LIMIT ?`,
    [userId, limit]
  );

  return rows.map((row) => ({
    ...row,
    durationMinutes: Number(row.durationMinutes) || 0,
    focusScore: row.focusScore === null ? null : Number(row.focusScore),
  }));
};

export default {
  ALLOWED_SORTS,
  listStudents,
  getCohortSummary,
  getStudentsNeedingAttention,
  findStudentByUuid,
  getStudentSubjects,
  getStudentTopics,
  getStudentRecentSessions,
};
