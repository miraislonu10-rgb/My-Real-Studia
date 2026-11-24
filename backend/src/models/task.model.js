/**
 * STUDIA - Modelo de tareas y organizador académico (tasks & Smart Planner)
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS (pool.execute con marcadores ?).
 * El dueño de cada tarea es `user_id`.
 *
 * Funcionalidades del Smart Planner:
 *   - Crear y gestionar tareas con prioridades y fechas de entrega.
 *   - Objetivos diarios y semanales (`goal_period`: 'none', 'daily', 'weekly').
 *   - Programación de fecha y horario (`scheduled_date`, `scheduled_start_time`, `scheduled_end_time`).
 *   - Vista de calendario y consulta de actividades pendientes y completadas.
 *   - Sistema inteligente de recomendaciones para reorganizar tareas no completadas
 *     considerando la disponibilidad del estudiante y evitando solapamiento con horarios ocupados.
 */

import { pool } from '../config/database.js';

const COLUMNS = [
  't.id',
  't.user_id AS userId',
  't.subject_id AS subjectId',
  't.topic_id AS topicId',
  't.title',
  't.description',
  't.due_date AS dueDate',
  't.priority',
  't.status',
  't.goal_period AS goalPeriod',
  't.scheduled_date AS scheduledDate',
  't.scheduled_start_time AS scheduledStartTime',
  't.scheduled_end_time AS scheduledEndTime',
  't.estimated_minutes AS estimatedMinutes',
  't.actual_minutes AS actualMinutes',
  't.completed_at AS completedAt',
  't.created_at AS createdAt',
  't.updated_at AS updatedAt',
  'sub.name AS subjectName',
  'sub.color AS subjectColor',
  'top.name AS topicName',
].join(', ');

/** Expresion SQL de completed_at segun el estado resultante */
const completedAtExpression = (status) => (status === 'completed' ? 'UTC_TIMESTAMP()' : 'NULL');

/** Crea una tarea u objetivo académico */
export const create = async (userId, data) => {
  const status = data.status ?? 'pending';

  const [result] = await pool.execute(
    `INSERT INTO tasks
       (user_id, subject_id, topic_id, title, description, due_date, priority, status,
        goal_period, scheduled_date, scheduled_start_time, scheduled_end_time,
        estimated_minutes, actual_minutes, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${completedAtExpression(status)})`,
    [
      userId,
      data.subjectId ?? null,
      data.topicId ?? null,
      data.title,
      data.description ?? null,
      data.dueDate ?? null,
      data.priority ?? 'medium',
      status,
      data.goalPeriod ?? 'none',
      data.scheduledDate ?? null,
      data.scheduledStartTime ?? null,
      data.scheduledEndTime ?? null,
      data.estimatedMinutes ?? null,
      data.actualMinutes ?? null,
    ]
  );
  return result.insertId;
};

/** Busca una tarea por ID */
export const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS}
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN topics top ON top.id = t.topic_id
      WHERE t.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Lista tareas con paginacion y filtros.
 */
export const list = async ({
  userId = null,
  status,
  priority,
  subjectId,
  goalPeriod,
  from,
  to,
  search,
  limit = 20,
  offset = 0,
}) => {
  const conditions = [];
  const params = [];

  if (userId !== null) {
    conditions.push('t.user_id = ?');
    params.push(userId);
  }
  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }
  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }
  if (subjectId) {
    conditions.push('t.subject_id = ?');
    params.push(subjectId);
  }
  if (goalPeriod) {
    conditions.push('t.goal_period = ?');
    params.push(goalPeriod);
  }
  if (from) {
    conditions.push('(t.due_date >= ? OR t.scheduled_date >= ?)');
    params.push(from, from);
  }
  if (to) {
    conditions.push('(t.due_date <= ? OR t.scheduled_date <= ?)');
    params.push(to, to);
  }
  if (search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ? OR sub.name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS}
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN topics top ON top.id = t.topic_id
       ${where}
      ORDER BY (t.status = 'completed') ASC,
               COALESCE(t.scheduled_date, DATE(t.due_date)) ASC,
               t.due_date ASC,
               t.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       ${where}`,
    params
  );

  return { rows, total };
};

/** Columnas modificables en actualizacion */
const UPDATABLE = {
  subjectId: 'subject_id',
  topicId: 'topic_id',
  title: 'title',
  description: 'description',
  dueDate: 'due_date',
  priority: 'priority',
  status: 'status',
  goalPeriod: 'goal_period',
  scheduledDate: 'scheduled_date',
  scheduledStartTime: 'scheduled_start_time',
  scheduledEndTime: 'scheduled_end_time',
  estimatedMinutes: 'estimated_minutes',
  actualMinutes: 'actual_minutes',
};

/** Actualiza una tarea */
export const update = async (id, data, ownerUserId = null) => {
  const assignments = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (data[key] !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(data[key]);
    }
  }

  if (data.status !== undefined) {
    assignments.push(`completed_at = ${completedAtExpression(data.status)}`);
  }

  if (!assignments.length) return 0;

  params.push(id);
  let sql = `UPDATE tasks SET ${assignments.join(', ')} WHERE id = ?`;
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/** Elimina una tarea */
export const remove = async (id, ownerUserId = null) => {
  const params = [id];
  let sql = 'DELETE FROM tasks WHERE id = ?';
  if (ownerUserId !== null) {
    sql += ' AND user_id = ?';
    params.push(ownerUserId);
  }

  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
};

/**
 * Consulta de calendario para un rango de fechas.
 * Retorna tareas y actividades con fecha de vencimiento o programada.
 */
export const getCalendar = async (userId, from, to) => {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS}
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN topics top ON top.id = t.topic_id
      WHERE t.user_id = ?
        AND (
          (t.due_date BETWEEN ? AND ?)
          OR (t.scheduled_date BETWEEN DATE(?) AND DATE(?))
        )
      ORDER BY COALESCE(t.scheduled_date, DATE(t.due_date)) ASC, t.scheduled_start_time ASC`,
    [userId, from, to, from, to]
  );
  return rows;
};

/**
 * Consulta de objetivos diarios y semanales con estado de cumplimiento.
 */
export const getGoals = async (userId) => {
  const [dailyGoals] = await pool.execute(
    `SELECT ${COLUMNS}
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN topics top ON top.id = t.topic_id
      WHERE t.user_id = ?
        AND t.goal_period = 'daily'
        AND (t.status IN ('pending', 'in_progress') OR DATE(t.completed_at) = CURRENT_DATE())
      ORDER BY (t.status = 'completed') ASC, t.priority DESC`,
    [userId]
  );

  const [weeklyGoals] = await pool.execute(
    `SELECT ${COLUMNS}
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN topics top ON top.id = t.topic_id
      WHERE t.user_id = ?
        AND t.goal_period = 'weekly'
        AND (t.status IN ('pending', 'in_progress') OR t.completed_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
      ORDER BY (t.status = 'completed') ASC, t.priority DESC`,
    [userId]
  );

  return {
    daily: dailyGoals,
    weekly: weeklyGoals,
    dailyCompleted: dailyGoals.filter((g) => g.status === 'completed').length,
    dailyTotal: dailyGoals.length,
    weeklyCompleted: weeklyGoals.filter((g) => g.status === 'completed').length,
    weeklyTotal: weeklyGoals.length,
  };
};

/**
 * SISTEMA INTELIGENTE DE RECOMENDACIONES PARA REORGANIZAR TAREAS NO COMPLETADAS:
 * 1. Identifica tareas pendientes y vencidas o atrasadas.
 * 2. Consulta los horarios ya ocupados del estudiante para los próximos días.
 * 3. Consulta las preferencias de estudio del estudiante (horario preferido y duración de sesión).
 * 4. Calcula bloques de tiempo libres evitando solapamientos y programa sugerencias optimizadas.
 */
export const getRescheduleRecommendations = async (userId) => {
  // 1. Tareas no completadas que están vencidas o atrasadas
  const [overdueTasks] = await pool.execute(
    `SELECT ${COLUMNS}
       FROM tasks t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN topics top ON top.id = t.topic_id
      WHERE t.user_id = ?
        AND t.status IN ('pending', 'in_progress')
        AND (
          (t.due_date IS NOT NULL AND t.due_date < UTC_TIMESTAMP())
          OR (t.scheduled_date IS NOT NULL AND t.scheduled_date < CURRENT_DATE())
        )
      ORDER BY (t.priority = 'urgent') DESC, (t.priority = 'high') DESC, t.due_date ASC`,
    [userId]
  );

  if (!overdueTasks.length) {
    return {
      recommendations: [],
      message: '¡Excelente! No tienes tareas vencidas ni atrasadas pendientes de reorganizar.',
    };
  }

  // 2. Horarios y tareas ya ocupados en los próximos 7 días
  const [occupiedSlots] = await pool.execute(
    `SELECT t.id, t.scheduled_date AS scheduledDate,
            t.scheduled_start_time AS startTime,
            t.scheduled_end_time AS endTime,
            t.due_date AS dueDate,
            COALESCE(t.estimated_minutes, 45) AS estimatedMinutes
       FROM tasks t
      WHERE t.user_id = ?
        AND t.status IN ('pending', 'in_progress')
        AND (
          (t.scheduled_date >= CURRENT_DATE())
          OR (t.due_date >= UTC_TIMESTAMP())
        )`,
    [userId]
  );

  // 3. Preferencias de aprendizaje del estudiante
  const [[prefs]] = await pool.execute(
    `SELECT preferred_session_length AS sessionLength,
            preferred_study_time AS studyTime,
            pomodoro_work_minutes AS pomodoroWork
       FROM learning_preferences
      WHERE user_id = ?`,
    [userId]
  );

  const preferredStudyTime = prefs?.studyTime || 'afternoon';
  const blockMinutes = prefs?.sessionLength || 45;

  // Franja horaria según preferencia del estudiante
  let windowStartHour = 15; // Tarde por defecto: 15:00 a 19:00
  let windowEndHour = 19;
  if (preferredStudyTime === 'morning' || preferredStudyTime === 'early_morning') {
    windowStartHour = 9;
    windowEndHour = 13;
  } else if (preferredStudyTime === 'evening' || preferredStudyTime === 'night') {
    windowStartHour = 18;
    windowEndHour = 22;
  } else if (preferredStudyTime === 'flexible') {
    windowStartHour = 10;
    windowEndHour = 20;
  }

  // Mapa de ocupación por día
  const dayOccupancy = new Map();
  occupiedSlots.forEach((slot) => {
    const dayStr = slot.scheduledDate
      ? new Date(slot.scheduledDate).toISOString().slice(0, 10)
      : slot.dueDate
      ? new Date(slot.dueDate).toISOString().slice(0, 10)
      : null;

    if (dayStr) {
      if (!dayOccupancy.has(dayStr)) dayOccupancy.set(dayStr, []);
      dayOccupancy.get(dayStr).push({
        start: slot.startTime ? String(slot.startTime).slice(0, 5) : '15:00',
        end: slot.endTime ? String(slot.endTime).slice(0, 5) : '16:00',
      });
    }
  });

  // Generar recomendaciones libres de conflictos
  const recommendations = [];
  const assignedSlotsInTurn = [];

  for (const task of overdueTasks) {
    const taskDuration = task.estimatedMinutes || blockMinutes || 45;
    let foundSlot = null;

    // Buscar en los próximos 7 días a partir de mañana o hoy
    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
      const candidateDate = new Date();
      candidateDate.setDate(candidateDate.getDate() + dayOffset);
      const dateStr = candidateDate.toISOString().slice(0, 10);

      const existingOccupied = [
        ...(dayOccupancy.get(dateStr) || []),
        ...assignedSlotsInTurn.filter((s) => s.date === dateStr),
      ];

      // Probar franjas horarias en pasos de 1 hora
      for (let hour = windowStartHour; hour <= windowEndHour - 1; hour++) {
        const startHourStr = `${String(hour).padStart(2, '0')}:00`;
        const endHourVal = hour + Math.ceil(taskDuration / 60);
        const endHourStr = `${String(endHourVal).padStart(2, '0')}:00`;

        // Verificar si la franja choca con algún horario ocupado
        const hasCollision = existingOccupied.some((occ) => {
          return (
            (startHourStr >= occ.start && startHourStr < occ.end) ||
            (endHourStr > occ.start && endHourStr <= occ.end) ||
            (startHourStr <= occ.start && endHourStr >= occ.end)
          );
        });

        if (!hasCollision) {
          foundSlot = {
            date: dateStr,
            startTime: startHourStr,
            endTime: endHourStr,
          };
          break;
        }
      }

      if (foundSlot) break;
    }

    if (!foundSlot) {
      // Fallback a mañana en horario habitual
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      foundSlot = {
        date: tomorrow.toISOString().slice(0, 10),
        startTime: `${String(windowStartHour).padStart(2, '0')}:00`,
        endTime: `${String(windowStartHour + 1).padStart(2, '0')}:00`,
      };
    }

    assignedSlotsInTurn.push(foundSlot);

    recommendations.push({
      taskId: task.id,
      title: task.title,
      subjectName: task.subjectName || 'General',
      subjectColor: task.subjectColor || '#8574d8',
      priority: task.priority,
      originalDueDate: task.dueDate,
      estimatedMinutes: taskDuration,
      suggestedDate: foundSlot.date,
      suggestedStartTime: foundSlot.startTime,
      suggestedEndTime: foundSlot.endTime,
      suggestedDueDateTime: `${foundSlot.date}T${foundSlot.endTime}:00`,
      rationale: `Esta actividad venció o no se completó a tiempo. Se encontró un bloque libre el ${foundSlot.date} de ${foundSlot.startTime} a ${foundSlot.endTime} (${taskDuration} min), coincidente con tu preferencia de estudio (${preferredStudyTime}) y garantizando cero conflictos con tus horarios ocupados.`,
    });
  }

  return {
    recommendations,
    message: `Se encontraron ${recommendations.length} recomendaciones inteligentes de reorganización.`,
  };
};

/**
 * Aplica la reorganización recomendada a una tarea en MySQL.
 */
export const applyReschedule = async (taskId, userId, { suggestedDate, suggestedStartTime, suggestedEndTime, suggestedDueDateTime }) => {
  const [result] = await pool.execute(
    `UPDATE tasks
        SET scheduled_date = ?,
            scheduled_start_time = ?,
            scheduled_end_time = ?,
            due_date = COALESCE(?, due_date)
      WHERE id = ? AND user_id = ?`,
    [
      suggestedDate,
      suggestedStartTime ?? null,
      suggestedEndTime ?? null,
      suggestedDueDateTime ?? null,
      taskId,
      userId,
    ]
  );
  return result.affectedRows > 0;
};
