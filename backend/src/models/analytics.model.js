/**
 * STUDIA - Modelo de analíticas académicas (Academic Analytics)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas con mysql2 (pool.execute).
 * PRINCIPIO DE DATOS HONESTOS:
 *   Calcula exclusivamente métricas agregadas reales de MySQL:
 *   - Tiempo total de estudio y sesiones (study_sessions).
 *   - Distribución de tiempo por materia (subjects & study_sessions).
 *   - Ejercicios realizados y porcentaje de aciertos (exercise_attempts).
 *   - Errores registrados y detección de errores recurrentes (errors).
 *   - Objetivos cumplidos diarios y semanales (tasks).
 *   - Series de evolución semanal y mensual.
 *   - Informe semanal con comparación con semanas anteriores (cuando existan datos suficientes).
 */

import { pool } from '../config/database.js';

/**
 * Resumen global y filtrado por fechas de analíticas académicas.
 */
export const getAcademicOverview = async (userId, { from, to } = {}) => {
  const sessionConditions = ['user_id = ?', 'ended_at IS NOT NULL'];
  const sessionParams = [userId];

  const attemptConditions = ['user_id = ?'];
  const attemptParams = [userId];

  const errorConditions = ['user_id = ?'];
  const errorParams = [userId];

  const goalConditions = ["user_id = ?", "goal_period IN ('daily', 'weekly')"];
  const goalParams = [userId];

  if (from) {
    sessionConditions.push('started_at >= ?');
    sessionParams.push(from);
    attemptConditions.push('started_at >= ?');
    attemptParams.push(from);
    errorConditions.push('(error_date >= ? OR created_at >= ?)');
    errorParams.push(from, from);
    goalConditions.push('completed_at >= ?');
    goalParams.push(from);
  }

  if (to) {
    sessionConditions.push('started_at <= ?');
    sessionParams.push(to);
    attemptConditions.push('started_at <= ?');
    attemptParams.push(to);
    errorConditions.push('(error_date <= ? OR created_at <= ?)');
    errorParams.push(to, to);
    goalConditions.push('completed_at <= ?');
    goalParams.push(to);
  }

  // 1. Tiempo total de estudio y sesiones
  const [[sessionTotals]] = await pool.execute(
    `SELECT COALESCE(SUM(duration_minutes), 0) AS totalStudyMinutes,
            COUNT(*) AS totalSessions,
            ROUND(AVG(focus_score), 1) AS averageFocusScore
       FROM study_sessions
      WHERE ${sessionConditions.join(' AND ')}`,
    sessionParams
  );

  // 2. Tiempo por materia
  const [timeBySubject] = await pool.execute(
    `SELECT s.id AS subjectId,
            COALESCE(s.name, 'Sin materia asignada') AS subjectName,
            COALESCE(s.color, '#8574d8') AS subjectColor,
            COALESCE(SUM(ss.duration_minutes), 0) AS totalMinutes,
            COUNT(ss.id) AS sessionCount
       FROM study_sessions ss
       LEFT JOIN subjects s ON s.id = ss.subject_id
      WHERE ${sessionConditions.map((c) => (c.startsWith('user_id') ? 'ss.user_id = ?' : `ss.${c}`)).join(' AND ')}
      GROUP BY s.id, s.name, s.color
      ORDER BY totalMinutes DESC`,
    sessionParams
  );

  // 3. Ejercicios realizados y porcentaje de respuestas correctas
  const [[exerciseStats]] = await pool.execute(
    `SELECT COUNT(*) AS totalAttempts,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correctAttempts,
            ROUND(
              (SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100,
              1
            ) AS accuracyPercentage
       FROM exercise_attempts
      WHERE ${attemptConditions.join(' AND ')}`,
    attemptParams
  );

  // 4. Errores registrados y tipos
  const [[errorStats]] = await pool.execute(
    `SELECT COUNT(*) AS totalErrors,
            SUM(CASE WHEN status IN ('pending', 'open') THEN 1 ELSE 0 END) AS pendingErrors,
            SUM(CASE WHEN status IN ('understood', 'resolved') THEN 1 ELSE 0 END) AS understoodErrors
       FROM errors
      WHERE ${errorConditions.join(' AND ')}`,
    errorParams
  );

  // 5. Errores recurrentes (ejercicios o temas donde han ocurrido 2 o más errores)
  const [recurringErrors] = await pool.execute(
    `SELECT COALESCE(e.exercise_title, e.title, 'Ejercicio no especificado') AS title,
            COUNT(*) AS occurrences,
            sub.name AS subjectName,
            sub.color AS subjectColor,
            MAX(COALESCE(e.error_date, DATE(e.created_at))) AS lastOccurred
       FROM errors e
       LEFT JOIN subjects sub ON sub.id = e.subject_id
      WHERE e.user_id = ?
      GROUP BY COALESCE(e.exercise_title, e.title), sub.name, sub.color
     HAVING COUNT(*) >= 2
      ORDER BY occurrences DESC
      LIMIT 10`,
    [userId]
  );

  // 6. Objetivos cumplidos (tareas marcadas como objetivo diario o semanal,
  //    contabilizadas por su fecha de finalizacion dentro del rango analizado)
  const [[goalStats]] = await pool.execute(
    `SELECT COUNT(*) AS totalGoalsCreated,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS goalsCompleted,
            SUM(CASE WHEN goal_period = 'daily' AND status = 'completed' THEN 1 ELSE 0 END) AS dailyGoalsCompleted,
            SUM(CASE WHEN goal_period = 'weekly' AND status = 'completed' THEN 1 ELSE 0 END) AS weeklyGoalsCompleted
       FROM tasks
      WHERE ${goalConditions.join(' AND ')}`,
    goalParams
  );

  // 7. Evolución diaria (últimos 30 días)
  const [dailyEvolution] = await pool.execute(
    `SELECT DATE_FORMAT(started_at, '%Y-%m-%d') AS date,
            COALESCE(SUM(duration_minutes), 0) AS minutes,
            COUNT(*) AS sessions
       FROM study_sessions
      WHERE user_id = ? AND ended_at IS NOT NULL
        AND started_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d')
      ORDER BY date ASC`,
    [userId]
  );

  // 8. Evolución semanal (últimas 8 semanas)
  const [weeklyEvolution] = await pool.execute(
    `SELECT YEARWEEK(started_at, 1) AS yearWeek,
            DATE_FORMAT(MIN(started_at), '%Y-%m-%d') AS weekStart,
            COALESCE(SUM(duration_minutes), 0) AS minutes,
            COUNT(*) AS sessions
       FROM study_sessions
      WHERE user_id = ? AND ended_at IS NOT NULL
        AND started_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 WEEK)
      GROUP BY YEARWEEK(started_at, 1)
      ORDER BY yearWeek ASC`,
    [userId]
  );

  // 9. Evolución mensual (últimos 12 meses)
  const [monthlyEvolution] = await pool.execute(
    `SELECT DATE_FORMAT(started_at, '%Y-%m') AS month,
            COALESCE(SUM(duration_minutes), 0) AS minutes,
            COUNT(*) AS sessions
       FROM study_sessions
      WHERE user_id = ? AND ended_at IS NOT NULL
        AND started_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(started_at, '%Y-%m')
      ORDER BY month ASC`,
    [userId]
  );

  return {
    overview: {
      totalStudyMinutes: Number(sessionTotals?.totalStudyMinutes || 0),
      totalStudyHours: Math.round(((sessionTotals?.totalStudyMinutes || 0) / 60) * 10) / 10,
      totalSessions: Number(sessionTotals?.totalSessions || 0),
      averageFocusScore: Number(sessionTotals?.averageFocusScore || 0),
      exercisesAttempted: Number(exerciseStats?.totalAttempts || 0),
      exercisesCorrect: Number(exerciseStats?.correctAttempts || 0),
      accuracyPercentage: Number(exerciseStats?.accuracyPercentage || 0),
      totalErrors: Number(errorStats?.totalErrors || 0),
      pendingErrors: Number(errorStats?.pendingErrors || 0),
      understoodErrors: Number(errorStats?.understoodErrors || 0),
      goalsCompleted: Number(goalStats?.goalsCompleted || 0),
      dailyGoalsCompleted: Number(goalStats?.dailyGoalsCompleted || 0),
      weeklyGoalsCompleted: Number(goalStats?.weeklyGoalsCompleted || 0),
    },
    timeBySubject,
    recurringErrors,
    evolution: {
      daily: dailyEvolution,
      weekly: weeklyEvolution,
      monthly: monthlyEvolution,
    },
  };
};

/**
 * Genera el informe semanal utilizando exclusivamente información real almacenada en MySQL,
 * e incluye comparaciones con semanas anteriores cuando existan datos suficientes.
 */
export const getWeeklyReport = async (userId, targetDate = new Date()) => {
  // Lunes de la semana objetivo
  const target = new Date(targetDate);
  const day = target.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(target);
  currentMonday.setUTCDate(target.getUTCDate() + diffToMonday);
  currentMonday.setUTCHours(0, 0, 0, 0);

  const currentSunday = new Date(currentMonday);
  currentSunday.setUTCDate(currentMonday.getUTCDate() + 6);
  currentSunday.setUTCHours(23, 59, 59, 999);

  // Lunes de la semana previa
  const prevMonday = new Date(currentMonday);
  prevMonday.setUTCDate(currentMonday.getUTCDate() - 7);
  const prevSunday = new Date(currentMonday);
  prevSunday.setUTCDate(currentMonday.getUTCDate() - 1);
  prevSunday.setUTCHours(23, 59, 59, 999);

  const curFrom = currentMonday.toISOString().slice(0, 19).replace('T', ' ');
  const curTo = currentSunday.toISOString().slice(0, 19).replace('T', ' ');
  const prevFrom = prevMonday.toISOString().slice(0, 19).replace('T', ' ');
  const prevTo = prevSunday.toISOString().slice(0, 19).replace('T', ' ');

  // Métricas semana actual
  const [[curStudy]] = await pool.execute(
    `SELECT COALESCE(SUM(duration_minutes), 0) AS minutes,
            COUNT(*) AS sessions,
            ROUND(AVG(focus_score), 1) AS avgFocus
       FROM study_sessions
      WHERE user_id = ? AND ended_at IS NOT NULL AND started_at BETWEEN ? AND ?`,
    [userId, curFrom, curTo]
  );

  const [[curTasks]] = await pool.execute(
    `SELECT COUNT(*) AS completed
       FROM tasks
      WHERE user_id = ? AND status = 'completed' AND completed_at BETWEEN ? AND ?`,
    [userId, curFrom, curTo]
  );

  const [[curErrors]] = await pool.execute(
    `SELECT COUNT(*) AS created,
            SUM(CASE WHEN status IN ('understood', 'resolved') THEN 1 ELSE 0 END) AS resolved
       FROM errors
      WHERE user_id = ? AND created_at BETWEEN ? AND ?`,
    [userId, curFrom, curTo]
  );

  const [[curExercises]] = await pool.execute(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM exercise_attempts
      WHERE user_id = ? AND started_at BETWEEN ? AND ?`,
    [userId, curFrom, curTo]
  );

  // Métricas semana previa
  const [[prevStudy]] = await pool.execute(
    `SELECT COALESCE(SUM(duration_minutes), 0) AS minutes,
            COUNT(*) AS sessions
       FROM study_sessions
      WHERE user_id = ? AND ended_at IS NOT NULL AND started_at BETWEEN ? AND ?`,
    [userId, prevFrom, prevTo]
  );

  const [[prevTasks]] = await pool.execute(
    `SELECT COUNT(*) AS completed
       FROM tasks
      WHERE user_id = ? AND status = 'completed' AND completed_at BETWEEN ? AND ?`,
    [userId, prevFrom, prevTo]
  );

  const [[prevExercises]] = await pool.execute(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM exercise_attempts
      WHERE user_id = ? AND started_at BETWEEN ? AND ?`,
    [userId, prevFrom, prevTo]
  );

  // Comprobar si existen datos suficientes en la semana anterior
  const hasPreviousData = (Number(prevStudy?.minutes || 0) > 0) || (Number(prevStudy?.sessions || 0) > 0) || (Number(prevTasks?.completed || 0) > 0);

  // Cálculo de comparativas reales (sin invención)
  let comparisons = null;
  if (hasPreviousData) {
    const curMinutes = Number(curStudy?.minutes || 0);
    const prevMinutes = Number(prevStudy?.minutes || 0);
    const minuteDelta = curMinutes - prevMinutes;
    const minutePercentage = prevMinutes > 0 ? Math.round((minuteDelta / prevMinutes) * 100) : null;

    const curSessions = Number(curStudy?.sessions || 0);
    const prevSessions = Number(prevStudy?.sessions || 0);
    const sessionDelta = curSessions - prevSessions;

    const curCompTasks = Number(curTasks?.completed || 0);
    const prevCompTasks = Number(prevTasks?.completed || 0);
    const taskDelta = curCompTasks - prevCompTasks;

    comparisons = {
      hasSufficientData: true,
      minuteDelta,
      minutePercentage,
      sessionDelta,
      taskDelta,
      summaryText: `Comparado con la semana anterior: ${minuteDelta >= 0 ? '+' : ''}${minuteDelta} minutos de estudio (${minuteDelta >= 0 ? 'aumento' : 'reducción'}), ${sessionDelta >= 0 ? '+' : ''}${sessionDelta} sesiones y ${taskDelta >= 0 ? '+' : ''}${taskDelta} tareas completadas.`,
    };
  } else {
    comparisons = {
      hasSufficientData: false,
      summaryText: 'Sin datos históricos suficientes de la semana anterior para realizar una comparación estadística válida.',
    };
  }

  // Materia con más estudio esta semana
  const [topSubjectRows] = await pool.execute(
    `SELECT s.name AS subjectName, s.color AS subjectColor,
            SUM(ss.duration_minutes) AS minutes
       FROM study_sessions ss
       JOIN subjects s ON s.id = ss.subject_id
      WHERE ss.user_id = ? AND ss.ended_at IS NOT NULL AND ss.started_at BETWEEN ? AND ?
      GROUP BY s.id, s.name, s.color
      ORDER BY minutes DESC
      LIMIT 1`,
    [userId, curFrom, curTo]
  );

  const topSubject = topSubjectRows[0] || null;

  return {
    weekRange: {
      from: currentMonday.toISOString().slice(0, 10),
      to: currentSunday.toISOString().slice(0, 10),
    },
    metrics: {
      studyMinutes: Number(curStudy?.minutes || 0),
      studyHours: Math.round(((curStudy?.minutes || 0) / 60) * 10) / 10,
      sessions: Number(curStudy?.sessions || 0),
      averageFocus: Number(curStudy?.avgFocus || 0),
      tasksCompleted: Number(curTasks?.completed || 0),
      errorsRecorded: Number(curErrors?.created || 0),
      errorsUnderstood: Number(curErrors?.resolved || 0),
      exercisesAttempted: Number(curExercises?.total || 0),
      exercisesCorrect: Number(curExercises?.correct || 0),
      accuracyPercentage:
        curExercises?.total > 0
          ? Math.round((Number(curExercises.correct) / Number(curExercises.total)) * 100)
          : null,
    },
    topSubject,
    comparisons,
    generatedAt: new Date().toISOString(),
  };
};
