/**
 * STUDIA - Modelo del panel (dashboard)
 * ------------------------------------------------------------------
 * Todas las consultas son AGREGADOS REALES sobre las tablas del estudiante o
 * del sistema. No se inventan cifras: cuando aun no hay registros los
 * agregados devuelven 0 o listas vacias, y es el cliente quien muestra un
 * estado vacio atractivo (nunca datos de relleno presentados como reales).
 *
 * SEGURIDAD: sentencias preparadas (pool.execute con marcadores ?). Las
 * consultas del estudiante filtran SIEMPRE por user_id = ?, de modo que un
 * estudiante jamas puede ver resumenes de otro.
 */

import { pool } from '../config/database.js';

/**
 * Conteos basicos del estudiante (materias, temas, tareas, ejercicios,
 * sesiones de estudio y tarjetas pendientes de repaso).
 * @param {number} userId
 */
export const getStudentCounts = async (userId) => {
  const [[row]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM subjects WHERE user_id = ?) AS subjects,
       (SELECT COUNT(*) FROM topics WHERE user_id = ?) AS topics,
       (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status IN ('pending','in_progress')) AS pendingTasks,
       (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'completed') AS completedTasks,
       (SELECT COUNT(*) FROM exercises WHERE user_id = ?) AS exercises,
       (SELECT COUNT(*) FROM study_sessions WHERE user_id = ?) AS studySessions`,
    [userId, userId, userId, userId, userId, userId]
  );
  return row;
};

/**
 * Actividad de estudio (minutos y sesiones) agrupada por dia en un rango.
 * @param {number} userId
 * @param {string} from Fecha MySQL (YYYY-MM-DD 00:00:00)
 * @param {string} to   Fecha MySQL (YYYY-MM-DD 23:59:59)
 */
export const getStudyActivityByDay = async (userId, from, to) => {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(started_at, '%Y-%m-%d') AS day,
            COALESCE(SUM(duration_minutes), 0) AS minutes,
            COUNT(*) AS sessions
       FROM study_sessions
      WHERE user_id = ? AND started_at BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d')
      ORDER BY day ASC`,
    [userId, from, to]
  );
  return rows;
};

/**
 * Totales de la semana de estudio actual (desde el lunes): minutos, sesiones
 * y tareas completadas.
 * @param {number} userId
 * @param {string} weekStart Fecha MySQL del lunes de la semana
 */
export const getWeekTotals = async (userId, weekStart) => {
  const [[row]] = await pool.execute(
    `SELECT
       (SELECT COALESCE(SUM(duration_minutes), 0) FROM study_sessions
         WHERE user_id = ? AND started_at >= ?) AS studyMinutes,
       (SELECT COUNT(*) FROM study_sessions
         WHERE user_id = ? AND started_at >= ?) AS sessions,
       (SELECT COUNT(*) FROM tasks
         WHERE user_id = ? AND status = 'completed' AND completed_at >= ?) AS tasksCompleted`,
    [userId, weekStart, userId, weekStart, userId, weekStart]
  );
  return row;
};

/**
 * Progreso medio por materia (a partir del avance de sus temas).
 * @param {number} userId
 */
export const getSubjectProgress = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT s.id AS subjectId, s.name AS subject, s.color AS color,
            COUNT(t.id) AS topics,
            COALESCE(ROUND(AVG(t.progress_percent)), 0) AS progressPercent
       FROM subjects s
       LEFT JOIN topics t ON t.subject_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id, s.name, s.color
      ORDER BY s.name ASC`,
    [userId]
  );
  return rows;
};

/**
 * Tareas pendientes con fecha de vencimiento (para "actividades pendientes"
 * y para marcar el calendario).
 * @param {number} userId
 * @param {number} limit
 */
export const getUpcomingTasks = async (userId, limit = 5) => {
  const [rows] = await pool.execute(
    `SELECT t.id, t.title, t.due_date AS dueDate, t.priority, t.status,
            s.name AS subject, s.color AS subjectColor
       FROM tasks t
       LEFT JOIN subjects s ON s.id = t.subject_id
      WHERE t.user_id = ? AND t.status IN ('pending','in_progress')
      ORDER BY (t.due_date IS NULL), t.due_date ASC, t.created_at DESC
      LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

/**
 * Tareas con vencimiento en un rango de fechas (alimenta el calendario).
 * @param {number} userId
 * @param {string} from
 * @param {string} to
 */
export const getCalendarEntries = async (userId, from, to) => {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(t.due_date, '%Y-%m-%d') AS day, COUNT(*) AS total
       FROM tasks t
      WHERE t.user_id = ? AND t.due_date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(t.due_date, '%Y-%m-%d')
      ORDER BY day ASC`,
    [userId, from, to]
  );
  return rows;
};

/** Recomendaciones pendientes del estudiante (dato real, no generado aqui). */
export const getPendingRecommendations = async (userId, limit = 5) => {
  const [rows] = await pool.execute(
    `SELECT r.id, r.type, r.title, r.description, r.priority, r.status, r.created_at AS createdAt
       FROM recommendations r
      WHERE r.user_id = ? AND r.status = 'pending'
      ORDER BY FIELD(r.priority, 'high', 'medium', 'low'), r.created_at DESC
      LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

/** Ultimo reporte semanal generado para el estudiante (si existe). */
export const getLatestWeeklyReport = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT week_start_date AS weekStartDate, week_end_date AS weekEndDate,
            total_study_minutes AS totalStudyMinutes, total_sessions AS totalSessions,
            tasks_completed AS tasksCompleted, tasks_pending AS tasksPending,
            accuracy_percentage AS accuracyPercentage, average_focus_score AS averageFocusScore,
            current_streak_days AS currentStreakDays, summary, strengths, improvement_areas AS improvementAreas,
            next_week_focus AS nextWeekFocus, generated_at AS generatedAt
       FROM weekly_reports
      WHERE user_id = ?
      ORDER BY week_start_date DESC
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

/* ------------------------------------------------------------------------ */
/*  Administracion                                                          */
/* ------------------------------------------------------------------------ */

/** Conteos globales del sistema para el panel del administrador. */
export const getAdminCounts = async () => {
  const [[row]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM users) AS totalUsers,
       (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
       (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admins,
       (SELECT COUNT(*) FROM users WHERE status = 'active') AS activeUsers,
       (SELECT COUNT(*) FROM users WHERE status = 'suspended') AS suspendedUsers,
       (SELECT COUNT(*) FROM subjects) AS subjects,
       (SELECT COUNT(*) FROM topics) AS topics,
       (SELECT COUNT(*) FROM tasks) AS tasks,
       (SELECT COUNT(*) FROM exercises) AS exercises,
       (SELECT COUNT(*) FROM educational_resources) AS resources,
       (SELECT COUNT(*) FROM educational_resources WHERE is_published = 1) AS publishedResources,
       (SELECT COUNT(*) FROM study_sessions) AS studySessions`
  );
  return row;
};

/** Altas de usuarios por dia en un rango (tendencia de registro). */
export const getRegistrationTrend = async (from) => {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS total
       FROM users
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY day ASC`,
    [from]
  );
  return rows;
};

/** Ultimos usuarios registrados. */
export const getRecentUsers = async (limit = 5) => {
  const [rows] = await pool.execute(
    `SELECT uuid, email, first_name AS firstName, last_name AS lastName,
            role, status, created_at AS createdAt
       FROM users
      ORDER BY created_at DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
};

/** Recursos educativos por tipo (distribucion del catalogo). */
export const getResourcesByType = async () => {
  const [rows] = await pool.execute(
    `SELECT resource_type AS resourceType, COUNT(*) AS total
       FROM educational_resources
      GROUP BY resource_type
      ORDER BY total DESC`
  );
  return rows;
};

export default {
  getStudentCounts,
  getStudyActivityByDay,
  getWeekTotals,
  getSubjectProgress,
  getUpcomingTasks,
  getCalendarEntries,
  getPendingRecommendations,
  getLatestWeeklyReport,
  getAdminCounts,
  getRegistrationTrend,
  getRecentUsers,
  getResourcesByType,
};
