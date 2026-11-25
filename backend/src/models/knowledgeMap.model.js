/**
 * STUDIA - Modelo del mapa de conocimiento (Knowledge Map)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas con mysql2 (pool.execute). Todo se filtra
 * por el `user_id` autenticado.
 *
 * El mapa combina, por cada TEMA, cuatro fuentes reales de MySQL:
 *   1. El progreso declarado en `topics` (progress_percent / status).
 *   2. La precision real en `exercise_attempts` de los ejercicios del tema.
 *   3. Los errores registrados en `errors` sobre ese tema.
 *   4. El dominio en `flashcards` (tarjetas dominadas) del tema.
 *
 * A partir de ellas calcula un `masteryScore` (0-100) transparente y estable,
 * describe las relaciones entre temas (pertenecen a la misma materia) y senala
 * los puntos fuertes y debiles. Nunca inventa cifras: si un tema no tiene
 * actividad, la maestria se apoya solo en el progreso declarado.
 */

import { pool } from '../config/database.js';

/** Limita un numero al rango [min, max]. */
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** Banda cualitativa del dominio segun el puntaje. */
const masteryBand = (score) => {
  if (score >= 90) return { id: 'mastered', label: 'Dominado' };
  if (score >= 75) return { id: 'strong', label: 'Solido' };
  if (score >= 55) return { id: 'developing', label: 'En desarrollo' };
  if (score >= 35) return { id: 'weak', label: 'Debil' };
  return { id: 'critical', label: 'Critico' };
};

/**
 * Calcula el dominio de un tema combinando progreso declarado, precision real,
 * dominio de tarjetas y penalizacion por errores abiertos.
 * Formula (documentada y determinista):
 *   base   = status === 'mastered' ? 100 : status === 'needs_review' ? min(progress,50) : progress
 *   prec   = precision de intentos (o `base` si no hay intentos)
 *   cards  = % de tarjetas dominadas (o `base` si no hay tarjetas)
 *   mastery = round(0.5*base + 0.3*prec + 0.2*cards) - min(30, errores*5)
 */
const computeMastery = ({ progressPercent, status, totalAttempts, correctAttempts, errorCount, totalCards, masteredCards }) => {
  const progress = clamp(Number(progressPercent) || 0);
  let base = progress;
  if (status === 'mastered') base = 100;
  else if (status === 'needs_review') base = Math.min(progress, 50);

  const accuracy =
    totalAttempts > 0 ? clamp(Math.round((correctAttempts / totalAttempts) * 100)) : base;

  const cardRatio =
    totalCards > 0 ? clamp(Math.round((masteredCards / totalCards) * 100)) : base;

  const errorPenalty = Math.min(30, Number(errorCount || 0) * 5);

  return clamp(Math.round(0.5 * base + 0.3 * accuracy + 0.2 * cardRatio) - errorPenalty);
};

/** Consulta los temas del usuario con sus metricas reales agregadas. */
const getTopicMetrics = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT t.id AS topicId,
            t.subject_id AS subjectId,
            t.name,
            t.difficulty_level AS difficultyLevel,
            t.priority,
            t.status,
            t.progress_percent AS progressPercent,
            s.name AS subjectName,
            COALESCE(s.color, '#8574d8') AS subjectColor,
            COALESCE(att.totalAttempts, 0) AS totalAttempts,
            COALESCE(att.correctAttempts, 0) AS correctAttempts,
            COALESCE(err.errorCount, 0) AS errorCount,
            COALESCE(card.totalCards, 0) AS totalCards,
            COALESCE(card.masteredCards, 0) AS masteredCards
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       LEFT JOIN (
         SELECT e.topic_id AS topicId,
                SUM(CASE WHEN a.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS totalAttempts,
                SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correctAttempts
           FROM exercises e
           JOIN exercise_attempts a ON a.exercise_id = e.id
          WHERE e.user_id = ? AND e.topic_id IS NOT NULL
          GROUP BY e.topic_id
       ) att ON att.topicId = t.id
       LEFT JOIN (
         SELECT topic_id AS topicId, COUNT(*) AS errorCount
           FROM errors
          WHERE user_id = ? AND topic_id IS NOT NULL
          GROUP BY topic_id
       ) err ON err.topicId = t.id
       LEFT JOIN (
         SELECT topic_id AS topicId,
                COUNT(*) AS totalCards,
                SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) AS masteredCards
           FROM flashcards
          WHERE user_id = ? AND topic_id IS NOT NULL
          GROUP BY topic_id
       ) card ON card.topicId = t.id
      WHERE t.user_id = ?
      ORDER BY s.name ASC, t.priority ASC, t.name ASC`,
    [userId, userId, userId, userId]
  );
  return rows;
};

/**
 * Genera el mapa de conocimiento completo.
 * @param {number} userId
 */
export const getMap = async (userId) => {
  const rows = await getTopicMetrics(userId);

  const nodes = rows.map((row) => {
    const totalAttempts = Number(row.totalAttempts || 0);
    const correctAttempts = Number(row.correctAttempts || 0);
    const totalCards = Number(row.totalCards || 0);
    const masteredCards = Number(row.masteredCards || 0);

    const masteryScore = computeMastery({
      progressPercent: row.progressPercent,
      status: row.status,
      totalAttempts,
      correctAttempts,
      errorCount: row.errorCount,
      totalCards,
      masteredCards,
    });

    return {
      topicId: row.topicId,
      name: row.name,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      subjectColor: row.subjectColor,
      difficultyLevel: row.difficultyLevel,
      priority: row.priority,
      status: row.status,
      progressPercent: Number(row.progressPercent || 0),
      masteryScore,
      band: masteryBand(masteryScore),
      accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null,
      attempts: totalAttempts,
      errorCount: Number(row.errorCount || 0),
      cards: totalCards,
      masteredCards,
    };
  });

  // Relaciones: los temas de una misma materia se enlazan en cadena (segun su
  // orden de prioridad), describiendo como se conectan dentro del temario.
  const bySubject = new Map();
  nodes.forEach((node) => {
    if (!bySubject.has(node.subjectId)) bySubject.set(node.subjectId, []);
    bySubject.get(node.subjectId).push(node);
  });

  const links = [];
  bySubject.forEach((list) => {
    for (let i = 0; i < list.length - 1; i += 1) {
      links.push({ source: list[i].topicId, target: list[i + 1].topicId, type: 'same_subject' });
    }
  });

  const subjects = Array.from(bySubject.entries()).map(([subjectId, list]) => ({
    subjectId,
    subjectName: list[0].subjectName,
    subjectColor: list[0].subjectColor,
    topicCount: list.length,
    averageMastery: Math.round(list.reduce((sum, node) => sum + node.masteryScore, 0) / list.length),
  }));

  const ranked = [...nodes].sort((a, b) => a.masteryScore - b.masteryScore);

  const summary = {
    totalTopics: nodes.length,
    mastered: nodes.filter((node) => node.band.id === 'mastered').length,
    needsReview:
      nodes.filter((node) => node.status === 'needs_review' || node.band.id === 'critical').length,
    inProgress: nodes.filter((node) => node.status === 'in_progress').length,
    pending: nodes.filter((node) => node.status === 'pending').length,
    averageMastery:
      nodes.length > 0
        ? Math.round(nodes.reduce((sum, node) => sum + node.masteryScore, 0) / nodes.length)
        : 0,
  };

  return {
    hasData: nodes.length > 0,
    summary,
    subjects,
    nodes,
    links,
    weakest: ranked.filter((node) => node.masteryScore < 75).slice(0, 5),
    strongest: [...ranked].reverse().slice(0, 5),
  };
};

export default { getMap };
