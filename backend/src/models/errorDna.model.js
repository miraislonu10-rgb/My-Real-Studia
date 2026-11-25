/**
 * STUDIA - Modelo de patrones de errores (Error DNA)
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS (pool.execute).
 * El propietario de cada registro es `user_id`.
 *
 * Error DNA analiza el HISTORIAL REAL de errores del diario (tabla `errors`)
 * para detectar la "huella" de error del estudiante: tipos dominantes,
 * materias y temas mas afectados, patrones recurrentes (mismo ejercicio o
 * titulo repetido) y su evolucion temporal. No inventa datos: cuando no hay
 * registros devuelve estructuras vacias y la UI lo indica.
 */

import { pool } from '../config/database.js';

/** Etiquetas legibles de cada tipo de error (ENUM de la tabla `errors`). */
export const ERROR_TYPE_LABELS = {
  conceptual: 'Conceptual',
  procedural: 'Procedimental',
  calculation: 'De calculo',
  interpretation: 'De interpretacion',
  memory: 'De memoria',
  careless: 'Por descuido',
  time_management: 'Gestion del tiempo',
};

/** Tipos validos del ENUM de la tabla `errors`. */
const ERROR_TYPES = Object.keys(ERROR_TYPE_LABELS);

/** Rango de fechas reutilizable (error_date o, si falta, la fecha de creacion). */
const dateRange = ({ from, to }) => {
  const conditions = [];
  const params = [];
  if (from) {
    conditions.push('(COALESCE(e.error_date, DATE(e.created_at)) >= ?)');
    params.push(from);
  }
  if (to) {
    conditions.push('(COALESCE(e.error_date, DATE(e.created_at)) <= ?)');
    params.push(to);
  }
  return { conditions, params };
};

/** Totales globales del diario. */
const getTotals = async (userId, filters) => {
  const { conditions, params } = dateRange(filters);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN e.status IN ('pending','open') THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN e.status = 'in_review' THEN 1 ELSE 0 END) AS inReview,
            SUM(CASE WHEN e.status IN ('understood','resolved') THEN 1 ELSE 0 END) AS resolved,
            SUM(CASE WHEN e.severity = 'high' THEN 1 ELSE 0 END) AS highSeverity
       FROM errors e
      WHERE e.user_id = ? ${where}`,
    [userId, ...params]
  );
  return {
    total: Number(row?.total || 0),
    pending: Number(row?.pending || 0),
    inReview: Number(row?.inReview || 0),
    resolved: Number(row?.resolved || 0),
    highSeverity: Number(row?.highSeverity || 0),
  };
};

/** Distribucion por tipo de error (la "firma" del Error DNA). */
const getTypeDistribution = async (userId, filters) => {
  const { conditions, params } = dateRange(filters);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT e.error_type AS errorType,
            COUNT(*) AS count,
            SUM(CASE WHEN e.status IN ('pending','open') THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN e.status IN ('understood','resolved') THEN 1 ELSE 0 END) AS resolved
       FROM errors e
      WHERE e.user_id = ? ${where}
      GROUP BY e.error_type`,
    [userId, ...params]
  );

  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const byType = ERROR_TYPES.map((type) => {
    const found = rows.find((row) => row.errorType === type);
    const count = Number(found?.count || 0);
    return {
      errorType: type,
      label: ERROR_TYPE_LABELS[type],
      count,
      pending: Number(found?.pending || 0),
      resolved: Number(found?.resolved || 0),
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return { total, byType };
};

/** Errores agrupados por materia. */
const getBySubject = async (userId, filters) => {
  const { conditions, params } = dateRange(filters);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT e.subject_id AS subjectId,
            COALESCE(s.name, 'Sin materia asignada') AS subjectName,
            COALESCE(s.color, '#8574d8') AS subjectColor,
            COUNT(*) AS count,
            SUM(CASE WHEN e.status IN ('pending','open') THEN 1 ELSE 0 END) AS pending
       FROM errors e
       LEFT JOIN subjects s ON s.id = e.subject_id
      WHERE e.user_id = ? ${where}
      GROUP BY e.subject_id, s.name, s.color
      ORDER BY count DESC
      LIMIT 12`,
    [userId, ...params]
  );
  return rows.map((row) => ({
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    subjectColor: row.subjectColor,
    count: Number(row.count || 0),
    pending: Number(row.pending || 0),
  }));
};

/** Errores agrupados por tema. */
const getByTopic = async (userId, filters) => {
  const { conditions, params } = dateRange(filters);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT e.topic_id AS topicId,
            COALESCE(t.name, 'Sin tema asignado') AS topicName,
            COALESCE(s.name, 'Sin materia') AS subjectName,
            COUNT(*) AS count
       FROM errors e
       LEFT JOIN topics t ON t.id = e.topic_id
       LEFT JOIN subjects s ON s.id = e.subject_id
      WHERE e.user_id = ? AND e.topic_id IS NOT NULL ${where}
      GROUP BY e.topic_id, t.name, s.name
      ORDER BY count DESC
      LIMIT 12`,
    [userId, ...params]
  );
  return rows.map((row) => ({
    topicId: row.topicId,
    topicName: row.topicName,
    subjectName: row.subjectName,
    count: Number(row.count || 0),
  }));
};

/**
 * Patrones recurrentes: mismo ejercicio o titulo repetido 2 o mas veces.
 * Estas son las "cadenas de ADN" que mas se repiten y que conviene atacar.
 */
const getRecurring = async (userId, limit = 10) => {
  const [rows] = await pool.execute(
    `SELECT COALESCE(e.exercise_title, e.title) AS pattern,
            COUNT(*) AS occurrences,
            COUNT(DISTINCT e.topic_id) AS topicsAffected,
            MAX(COALESCE(e.error_date, DATE(e.created_at))) AS lastOccurred,
            SUBSTRING_INDEX(GROUP_CONCAT(e.error_type ORDER BY e.error_type), ',', 1) AS dominantType,
            COALESCE(s.name, 'Sin materia') AS subjectName,
            COALESCE(s.color, '#8574d8') AS subjectColor,
            MAX(e.subject_id) AS subjectId,
            MAX(e.topic_id) AS topicId
       FROM errors e
       LEFT JOIN subjects s ON s.id = e.subject_id
      WHERE e.user_id = ?
      GROUP BY COALESCE(e.exercise_title, e.title), s.name, s.color
     HAVING COUNT(*) >= 2
      ORDER BY occurrences DESC
      LIMIT ?`,
    [userId, limit]
  );
  return rows.map((row) => ({
    pattern: row.pattern,
    occurrences: Number(row.occurrences || 0),
    topicsAffected: Number(row.topicsAffected || 0),
    lastOccurred: row.lastOccurred,
    dominantType: row.dominantType,
    dominantTypeLabel: ERROR_TYPE_LABELS[row.dominantType] || 'Sin clasificar',
    subjectName: row.subjectName,
    subjectColor: row.subjectColor,
    subjectId: row.subjectId,
    topicId: row.topicId,
  }));
};

/** Evolucion mensual de errores (ultimos 6 meses). */
const getTrend = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(COALESCE(e.error_date, DATE(e.created_at)), '%Y-%m') AS month,
            COUNT(*) AS count,
            SUM(CASE WHEN e.status IN ('understood','resolved') THEN 1 ELSE 0 END) AS resolved
       FROM errors e
      WHERE e.user_id = ?
        AND COALESCE(e.error_date, DATE(e.created_at)) >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC`,
    [userId]
  );
  return rows.map((row) => ({
    month: row.month,
    count: Number(row.count || 0),
    resolved: Number(row.resolved || 0),
  }));
};

/**
 * Construye la huella (signature) del Error DNA: los 3 tipos dominantes y el
 * nivel de resolucion. Todo derivado del historial real del estudiante.
 */
const buildSignature = (byType, totals) => {
  const ranked = [...byType].filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
  const dominant = ranked.slice(0, 3).map((item) => ({
    errorType: item.errorType,
    label: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  const resolutionRate =
    totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0;

  return {
    dominant,
    totalTypes: ranked.length,
    resolutionRate,
  };
};

/**
 * Analisis completo del Error DNA para el estudiante autenticado.
 * @param {number} userId
 * @param {{from?:string, to?:string}} filters
 */
export const getAnalysis = async (userId, filters = {}) => {
  const [totals, typeDistribution, bySubject, byTopic, recurring, trend] = await Promise.all([
    getTotals(userId, filters),
    getTypeDistribution(userId, filters),
    getBySubject(userId, filters),
    getByTopic(userId, filters),
    getRecurring(userId, 10),
    getTrend(userId),
  ]);

  const signature = buildSignature(typeDistribution.byType, totals);

  return {
    hasData: totals.total > 0,
    totals,
    signature,
    typeDistribution: typeDistribution.byType,
    bySubject,
    byTopic,
    recurring,
    trend,
  };
};

export default { getAnalysis, ERROR_TYPE_LABELS };
