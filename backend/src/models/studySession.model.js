/**
 * STUDIA - Modelo de sesiones de estudio (Smart Focus)
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas utilizan sentencias preparadas con mysql2.
 * El dueño de cada sesion es `user_id`.
 *
 * El calculo de duracion se apoya en marcas de tiempo reales en el servidor
 * (started_at, ended_at, last_paused_at, paused_seconds), asegurando que el
 * tiempo transcurrido sea exacto incluso si el estudiante cierra o recarga el
 * navegador web.
 *
 * PREVENCION DE DUPLICADOS:
 *   - Si un usuario ya tiene una sesion activa (ended_at IS NULL), iniciar una
 *     nueva devuelve la sesion existente en lugar de registrar duplicados.
 *   - Soporte opcional de `client_session_id` para garantizar idempotencia.
 */

import { pool } from '../config/database.js';

const SESSION_COLUMNS = [
  's.id',
  's.user_id AS userId',
  's.client_session_id AS clientSessionId',
  's.subject_id AS subjectId',
  's.topic_id AS topicId',
  's.started_at AS startedAt',
  's.ended_at AS endedAt',
  's.duration_minutes AS durationMinutes',
  's.duration_seconds AS durationSeconds',
  's.paused_seconds AS pausedSeconds',
  's.is_paused AS isPaused',
  's.last_paused_at AS lastPausedAt',
  's.session_type AS sessionType',
  's.focus_score AS focusScore',
  's.mood',
  's.notes',
  's.created_at AS createdAt',
  's.updated_at AS updatedAt',
  'sub.name AS subjectName',
  'sub.color AS subjectColor',
  'top.name AS topicName',
].join(', ');

/** Busca una sesion por su ID con datos relacionados de materia y tema */
export const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${SESSION_COLUMNS}
       FROM study_sessions s
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       LEFT JOIN topics top ON top.id = s.topic_id
      WHERE s.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Obtiene la sesion activa del usuario (donde ended_at IS NULL).
 * Si hay alguna sesion activa, calcula los segundos transcurridos reales
 * a partir de las marcas de tiempo del servidor.
 */
export const findActiveSession = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${SESSION_COLUMNS},
            TIMESTAMPDIFF(SECOND, s.started_at, UTC_TIMESTAMP()) AS rawElapsedSeconds,
            CASE 
              WHEN s.is_paused = 1 AND s.last_paused_at IS NOT NULL 
              THEN TIMESTAMPDIFF(SECOND, s.last_paused_at, UTC_TIMESTAMP())
              ELSE 0 
            END AS currentPauseDeltaSeconds
       FROM study_sessions s
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       LEFT JOIN topics top ON top.id = s.topic_id
      WHERE s.user_id = ? AND s.ended_at IS NULL
      ORDER BY s.started_at DESC
      LIMIT 1`,
    [userId]
  );

  if (!rows.length) return null;

  const session = rows[0];
  const totalPaused = (session.pausedSeconds || 0) + (session.currentPauseDeltaSeconds || 0);
  const calculatedElapsedSeconds = Math.max(0, (session.rawElapsedSeconds || 0) - totalPaused);

  return {
    ...session,
    elapsedSeconds: calculatedElapsedSeconds,
  };
};

/**
 * Busca por clientSessionId para evitar duplicados en reintentos.
 */
export const findByClientSessionId = async (userId, clientSessionId) => {
  if (!clientSessionId) return null;
  const [rows] = await pool.execute(
    `SELECT ${SESSION_COLUMNS}
       FROM study_sessions s
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       LEFT JOIN topics top ON top.id = s.topic_id
      WHERE s.user_id = ? AND s.client_session_id = ?
      LIMIT 1`,
    [userId, clientSessionId]
  );
  return rows[0] || null;
};

/**
 * Inicia una nueva sesion de estudio.
 * Si ya existe una activa para este usuario, la retorna directamente para no duplicar.
 */
export const start = async (userId, data) => {
  // 1. Verificar idempotencia por clientSessionId
  if (data.clientSessionId) {
    const existingClient = await findByClientSessionId(userId, data.clientSessionId);
    if (existingClient) return existingClient;
  }

  // 2. Verificar si ya tiene una sesion activa en curso
  const active = await findActiveSession(userId);
  if (active) {
    return active;
  }

  // 3. Crear nueva sesion con marca de tiempo UTC
  const [result] = await pool.execute(
    `INSERT INTO study_sessions
       (user_id, client_session_id, subject_id, topic_id, started_at, session_type, notes,
        duration_minutes, duration_seconds, paused_seconds, is_paused)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, 0, 0, 0, 0)`,
    [
      userId,
      data.clientSessionId ?? null,
      data.subjectId ?? null,
      data.topicId ?? null,
      data.sessionType ?? 'free',
      data.notes ?? null,
    ]
  );

  return findById(result.insertId);
};

/**
 * Pausa la sesion activa.
 */
export const pause = async (id, userId) => {
  const session = await findById(id);
  if (!session || session.userId !== userId) return null;
  if (session.endedAt) return session; // ya finalizada
  if (session.isPaused) return session; // ya estaba pausada

  await pool.execute(
    `UPDATE study_sessions
        SET is_paused = 1,
            last_paused_at = UTC_TIMESTAMP()
      WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return findActiveSession(userId);
};

/**
 * Reanuda la sesion pausada.
 * Acumula el tiempo que paso en pausa a `paused_seconds` y desmarca `is_paused`.
 */
export const resume = async (id, userId) => {
  const session = await findById(id);
  if (!session || session.userId !== userId) return null;
  if (session.endedAt) return session; // ya finalizada
  if (!session.isPaused) return session; // no estaba pausada

  await pool.execute(
    `UPDATE study_sessions
        SET is_paused = 0,
            paused_seconds = paused_seconds + GREATEST(0, TIMESTAMPDIFF(SECOND, COALESCE(last_paused_at, UTC_TIMESTAMP()), UTC_TIMESTAMP())),
            last_paused_at = NULL
      WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return findActiveSession(userId);
};

/**
 * Finaliza la sesion de estudio:
 * - Calcula la duracion total exacta con marcas de tiempo (UTC_TIMESTAMP - started_at - paused_seconds).
 * - Registra hora de finalizacion (ended_at).
 * - Registra productividad percibida (focus_score de 1 a 5) y actividad/notas finales.
 * - Evita duplicados: si ya estaba finalizada, retorna la sesion sin reescribir.
 */
export const finish = async (id, userId, data = {}) => {
  const session = await findById(id);
  if (!session || session.userId !== userId) return null;

  // Si ya estaba finalizada, devolvemos la existente (idempotente)
  if (session.endedAt) {
    return session;
  }

  // Calculamos la duracion precisa
  await pool.execute(
    `UPDATE study_sessions
        SET ended_at = UTC_TIMESTAMP(),
            paused_seconds = paused_seconds + CASE 
              WHEN is_paused = 1 AND last_paused_at IS NOT NULL 
              THEN GREATEST(0, TIMESTAMPDIFF(SECOND, last_paused_at, UTC_TIMESTAMP()))
              ELSE 0 
            END,
            is_paused = 0,
            last_paused_at = NULL,
            focus_score = COALESCE(?, focus_score),
            notes = COALESCE(?, notes),
            mood = COALESCE(?, mood),
            subject_id = COALESCE(?, subject_id),
            topic_id = COALESCE(?, topic_id)
      WHERE id = ? AND user_id = ?`,
    [
      data.focusScore ?? null,
      data.notes ?? null,
      data.mood ?? null,
      data.subjectId ?? null,
      data.topicId ?? null,
      id,
      userId,
    ]
  );

  // Actualizamos la duracion en segundos y minutos finales
  await pool.execute(
    `UPDATE study_sessions
        SET duration_seconds = GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, ended_at) - paused_seconds),
            duration_minutes = GREATEST(1, ROUND(GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, ended_at) - paused_seconds) / 60))
      WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return findById(id);
};

/**
 * Descarta una sesion activa (por si se inicio por error y no se quiere guardar).
 */
export const discard = async (id, userId) => {
  const [result] = await pool.execute(
    `DELETE FROM study_sessions WHERE id = ? AND user_id = ? AND ended_at IS NULL`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

/**
 * Lista historial de sesiones de estudio completadas con filtros y paginacion.
 */
export const list = async ({
  userId,
  subjectId,
  sessionType,
  from,
  to,
  limit = 20,
  offset = 0,
}) => {
  const conditions = ['s.ended_at IS NOT NULL'];
  const params = [];

  if (userId !== null && userId !== undefined) {
    conditions.push('s.user_id = ?');
    params.push(userId);
  }
  if (subjectId) {
    conditions.push('s.subject_id = ?');
    params.push(subjectId);
  }
  if (sessionType) {
    conditions.push('s.session_type = ?');
    params.push(sessionType);
  }
  if (from) {
    conditions.push('s.started_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('s.started_at <= ?');
    params.push(to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM study_sessions s ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `SELECT ${SESSION_COLUMNS}
       FROM study_sessions s
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       LEFT JOIN topics top ON top.id = s.topic_id
       ${whereClause}
      ORDER BY s.started_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
};

/**
 * Metricas y resumen de estudio para el estudiante.
 */
export const getStats = async (userId) => {
  const [[todayStats]] = await pool.execute(
    `SELECT 
       COALESCE(SUM(duration_minutes), 0) AS minutesToday,
       COALESCE(SUM(duration_seconds), 0) AS secondsToday,
       COUNT(*) AS sessionsToday
      FROM study_sessions
     WHERE user_id = ?
       AND ended_at IS NOT NULL
       AND DATE(started_at) = CURRENT_DATE()`,
    [userId]
  );

  const [[weekStats]] = await pool.execute(
    `SELECT 
       COALESCE(SUM(duration_minutes), 0) AS minutesWeek,
       COUNT(*) AS sessionsWeek
      FROM study_sessions
     WHERE user_id = ?
       AND ended_at IS NOT NULL
       AND started_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`,
    [userId]
  );

  const [[overallStats]] = await pool.execute(
    `SELECT 
       COALESCE(SUM(duration_minutes), 0) AS totalMinutes,
       COUNT(*) AS totalSessions,
       ROUND(COALESCE(AVG(focus_score), 0), 1) AS averageFocusScore
      FROM study_sessions
     WHERE user_id = ?
       AND ended_at IS NOT NULL`,
    [userId]
  );

  return {
    today: {
      minutes: Number(todayStats?.minutesToday || 0),
      seconds: Number(todayStats?.secondsToday || 0),
      sessions: Number(todayStats?.sessionsToday || 0),
    },
    week: {
      minutes: Number(weekStats?.minutesWeek || 0),
      sessions: Number(weekStats?.sessionsWeek || 0),
    },
    overall: {
      totalMinutes: Number(overallStats?.totalMinutes || 0),
      totalSessions: Number(overallStats?.totalSessions || 0),
      averageFocusScore: Number(overallStats?.averageFocusScore || 0),
    },
  };
};
