/**
 * STUDIA - Modelo del plan de rescate de estudio (Study Rescue)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas. Todo se calcula sobre el estudiante
 * autenticado.
 *
 * Study Rescue construye un plan de estudio personalizado para preparar un
 * examen con fecha limite. Se apoya en datos reales ya calculados por otros
 * modulos:
 *   - El dominio por tema (Knowledge Map) para priorizar lo mas debil.
 *   - Las tarjetas pendientes de repaso (Memory Lab).
 *   - Los errores recurrentes (Error DNA).
 *
 * `buildPlan` NO escribe nada: solo propone. El controlador decide si persiste
 * las tareas reales en `tasks` (Smart Planner).
 */

import * as knowledgeMapModel from './knowledgeMap.model.js';
import * as flashcardModel from './flashcard.model.js';
import * as errorDnaModel from './errorDna.model.js';

/** Formatea una fecha local como YYYY-MM-DD (sin desfase de zona horaria). */
const formatDateOnly = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Dias completos entre hoy y el examen (minimo 1, maximo 60). */
const daysUntil = (examDate) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const exam = new Date(`${examDate}T00:00:00`);
  let days = Math.round((exam.getTime() - start.getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 1) days = 1;
  return Math.min(days, 60);
};

/** Prioridad de una tarea segun el dominio del tema. */
const priorityForMastery = (mastery) => {
  if (mastery < 35) return 'urgent';
  if (mastery < 55) return 'high';
  return 'medium';
};

/**
 * Construye (sin persistir) el plan de rescate.
 * @param {number} userId
 * @param {{subjectId?:number|null, examDate:string, availableMinutesPerDay?:number, maxTopics?:number}} params
 */
export const buildPlan = async (userId, params) => {
  const availableMinutesPerDay = Math.min(
    Math.max(Number(params.availableMinutesPerDay) || 90, 20),
    600
  );
  const maxTopics = Math.min(Math.max(Number(params.maxTopics) || 8, 1), 20);
  const days = daysUntil(params.examDate);
  const subjectId = params.subjectId ? Number(params.subjectId) : null;

  const [map, pendingCards, dna] = await Promise.all([
    knowledgeMapModel.getMap(userId),
    flashcardModel.getPendingReview(userId, 200),
    errorDnaModel.getAnalysis(userId, {}),
  ]);

  // Temas a rescatar: los mas debiles (dominio < 75) de la materia elegida.
  const weakTopics = map.nodes
    .filter((node) => (subjectId ? node.subjectId === subjectId : true))
    .filter((node) => node.masteryScore < 75)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, maxTopics);

  // Distribucion de la fecha de cada bloque: reparto round-robin entre los dias.
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const items = [];
  weakTopics.forEach((topic, index) => {
    const dayIndex = index % days;
    const date = new Date(start);
    date.setDate(start.getDate() + dayIndex);

    const minutes = topic.progressPercent === 0 && topic.attempts === 0 ? 60 : 45;
    const reason =
      topic.errorCount > 0
        ? `Tema debil (dominio ${topic.masteryScore}%) con ${topic.errorCount} error(es) registrados.`
        : `Tema con dominio ${topic.masteryScore}% que conviene reforzar antes del examen.`;

    items.push({
      topicId: topic.topicId,
      topicName: topic.name,
      subjectId: topic.subjectId,
      subjectName: topic.subjectName,
      subjectColor: topic.subjectColor,
      date: formatDateOnly(date),
      title: `Rescate: ${topic.name}`,
      description: `Plan de rescate de estudio. ${reason} Dedica un bloque enfocado y resuelve ejercicios del tema.`,
      priority: priorityForMastery(topic.masteryScore),
      estimatedMinutes: minutes,
      masteryScore: topic.masteryScore,
      reason,
    });
  });

  // Bloque de repaso de tarjetas pendientes (Memory Lab).
  const relevantCards = subjectId
    ? pendingCards.filter((card) => card.subjectId === subjectId)
    : pendingCards;
  if (relevantCards.length > 0) {
    const date = new Date(start);
    date.setDate(start.getDate() + (items.length % days));
    items.push({
      topicId: null,
      topicName: null,
      subjectId: subjectId || null,
      subjectName: relevantCards[0]?.subjectName || null,
      subjectColor: relevantCards[0]?.subjectColor || null,
      date: formatDateOnly(date),
      title: `Repaso espaciado de ${relevantCards.length} tarjeta(s)`,
      description:
        'Repasa en Memory Lab las tarjetas pendientes programadas por el algoritmo SM-2 para consolidar la memoria a largo plazo.',
      priority: 'medium',
      estimatedMinutes: Math.min(45, Math.max(15, relevantCards.length * 3)),
      masteryScore: null,
      reason: `${relevantCards.length} tarjeta(s) pendientes de repaso hoy.`,
    });
  }

  // Bloque de refuerzo de errores recurrentes (Error DNA).
  const relevantRecurring = subjectId
    ? dna.recurring.filter((item) => item.subjectId === subjectId)
    : dna.recurring;
  if (relevantRecurring.length > 0) {
    const date = new Date(start);
    date.setDate(start.getDate() + (items.length % days));
    items.push({
      topicId: relevantRecurring[0]?.topicId || null,
      topicName: null,
      subjectId: subjectId || null,
      subjectName: relevantRecurring[0]?.subjectName || null,
      subjectColor: relevantRecurring[0]?.subjectColor || null,
      date: formatDateOnly(date),
      title: 'Reforzar errores recurrentes',
      description: `Analiza en Error DNA y corrige los patrones que repites: ${relevantRecurring
        .slice(0, 3)
        .map((item) => item.pattern)
        .join(', ')}.`,
      priority: 'high',
      estimatedMinutes: 30,
      masteryScore: null,
      reason: `${relevantRecurring.length} patron(es) de error recurrentes.`,
    });
  }

  // Carga por dia y deteccion de exceso sobre la disponibilidad declarada.
  const perDay = {};
  items.forEach((item) => {
    perDay[item.date] = (perDay[item.date] || 0) + item.estimatedMinutes;
  });
  const dayLoads = Object.entries(perDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, minutes]) => ({
      date,
      minutes,
      exceedsAvailability: minutes > availableMinutesPerDay,
    }));

  const totalPlannedMinutes = items.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  return {
    hasData: items.length > 0,
    examDate: params.examDate,
    daysAvailable: days,
    availableMinutesPerDay,
    subjectId,
    totalPlannedMinutes,
    itemCount: items.length,
    items,
    dayLoads,
    context: {
      weakTopics: weakTopics.map((topic) => ({
        topicId: topic.topicId,
        name: topic.name,
        subjectName: topic.subjectName,
        masteryScore: topic.masteryScore,
      })),
      dueFlashcards: relevantCards.length,
      recurringPatterns: relevantRecurring.length,
    },
  };
};

export default { buildPlan };
