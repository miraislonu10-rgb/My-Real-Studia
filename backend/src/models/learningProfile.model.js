/**
 * STUDIA - Modelo de perfil y preferencias de aprendizaje (Learning Profile)
 * ------------------------------------------------------------------
 * SEGURIDAD: sentencias preparadas con mysql2 (pool.execute).
 *
 * PRINCIPIO CIENTÍFICO Y DINÁMICO:
 *   No clasifica al estudiante en una categoría rígida ni limitante (visual, auditivo o kinestésico).
 *   En su lugar, genera un perfil dinámico multidimensional basado en estrategias de
 *   aprendizaje activo (resolución de problemas, esquemas, recuerdo activo con preguntas,
 *   repetición espaciada, estructuración paso a paso y resistencia de enfoque).
 *
 *   Este perfil dinámico se almacena en MySQL y se utiliza para personalizar
 *   las recomendaciones del Smart Planner y del cronómetro Smart Focus.
 */

import { pool } from '../config/database.js';

const PROFILE_COLUMNS = [
  'id',
  'user_id AS userId',
  'learning_style AS learningStyle',
  'step_by_step_pref AS stepByStepPref',
  'problem_solving_pref AS problemSolvingPref',
  'concept_maps_pref AS conceptMapsPref',
  'questioning_pref AS questioningPref',
  'spaced_repetition_pref AS spacedRepetitionPref',
  'break_frequency_minutes AS breakFrequencyMinutes',
  'preferred_session_length AS preferredSessionLength',
  'preferred_study_time AS preferredStudyTime',
  'notifications_enabled AS notificationsEnabled',
  'reminder_time AS reminderTime',
  'pomodoro_work_minutes AS pomodoroWorkMinutes',
  'pomodoro_break_minutes AS pomodoroBreakMinutes',
  'weekly_goal_minutes AS weeklyGoalMinutes',
  'dynamic_profile AS dynamicProfile',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

/**
 * Genera el perfil dinámico multidimensional a partir de las respuestas.
 * Evita categorías rígidas y produce arquetipos de estrategia flexibles.
 */
export const calculateDynamicProfile = ({
  stepByStepPref = 3,
  problemSolvingPref = 3,
  conceptMapsPref = 3,
  questioningPref = 3,
  spacedRepetitionPref = 3,
  preferredSessionLength = 25,
  breakFrequencyMinutes = 5,
  preferredStudyTime = 'flexible',
}) => {
  // Puntuaciones dimensionales normalizadas (1 a 5)
  const dimensions = {
    analisisEstructurado: Number(stepByStepPref),
    resolucionPractica: Number(problemSolvingPref),
    esquemasYConceptos: Number(conceptMapsPref),
    recuerdoActivoPreguntas: Number(questioningPref),
    repeticionEspaciada: Number(spacedRepetitionPref),
  };

  // Determinación de arquetipo dinámico flexible
  let archetypeTitle = 'Aprendiz Multidimensional Adaptativo';
  let dominantTraits = [];

  if (problemSolvingPref >= 4 && questioningPref >= 4) {
    archetypeTitle = 'Estratega Práctico con Recuperación Activa';
    dominantTraits.push('Aprende ejecutando y poniéndose a prueba constantemente');
  } else if (stepByStepPref >= 4 && conceptMapsPref >= 4) {
    archetypeTitle = 'Arquitecto Analítico de Conceptos';
    dominantTraits.push('Domina la materia organizando esquemas visuales y secuencias lógicas');
  } else if (spacedRepetitionPref >= 4 && questioningPref >= 4) {
    archetypeTitle = 'Consolidador Espaciado de Alto Rendimiento';
    dominantTraits.push('Excelente memoria a largo plazo mediante intervalos distribuidos');
  } else if (problemSolvingPref >= 4) {
    archetypeTitle = 'Explorador Orientado a Problemas';
    dominantTraits.push('Asimilación óptima mediante retos prácticos y aplicación');
  } else if (stepByStepPref >= 4) {
    archetypeTitle = 'Pensador Sistemático y Estructurado';
    dominantTraits.push('Avanza con solidez mediante algoritmos y descomposiciones paso a paso');
  } else {
    archetypeTitle = 'Estratega Flexible y Equilibrado';
    dominantTraits.push('Capacidad para combinar diversas modalidades según la materia');
  }

  // Recomendaciones accionables y personalizadas
  const recommendations = [];

  if (stepByStepPref >= 4) {
    recommendations.push(
      'Desglosa temas complejos en micro-pasos de 3 a 5 fases antes de abordar problemas generales.'
    );
  }
  if (problemSolvingPref >= 4) {
    recommendations.push(
      'Aplica el método de "Práctica Inversa": revisa un ejercicio modelo y resuelve de inmediato variantes sin mirar la solución.'
    );
  }
  if (conceptMapsPref >= 4) {
    recommendations.push(
      'Dedica los primeros 7 minutos de cada sesión a elaborar un mapa mental jerárquico de la materia.'
    );
  }
  if (questioningPref >= 4) {
    recommendations.push(
      'Crea tarjetas de preguntas abiertas al terminar de leer un tema para entrenar el recuerdo activo.'
    );
  }
  if (spacedRepetitionPref >= 4) {
    recommendations.push(
      'Programa sesiones de repaso en Smart Planner a las 24 horas, 3 días y 7 días del estudio inicial.'
    );
  }

  // Recomendación de ritmo de trabajo
  recommendations.push(
    `Ritmo óptimo configurado: bloques de ${preferredSessionLength} minutos con descansos de ${breakFrequencyMinutes} minutos, priorizando horarios de ${
      preferredStudyTime === 'morning'
        ? 'mañana'
        : preferredStudyTime === 'afternoon'
        ? 'tarde'
        : preferredStudyTime === 'evening'
        ? 'noche'
        : 'horario flexible'
    }.`
  );

  return {
    archetypeTitle,
    dominantTraits,
    dimensions,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Obtiene las preferencias y el perfil dinámico del estudiante.
 */
export const findByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${PROFILE_COLUMNS} FROM learning_preferences WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    // Si aún no existe el registro, generamos uno por defecto
    const defaultDynamic = calculateDynamicProfile({});
    await pool.execute(
      `INSERT INTO learning_preferences
         (user_id, learning_style, step_by_step_pref, problem_solving_pref,
          concept_maps_pref, questioning_pref, spaced_repetition_pref,
          break_frequency_minutes, preferred_session_length, preferred_study_time,
          dynamic_profile)
       VALUES (?, 'mixed', 3, 3, 3, 3, 3, 5, 25, 'flexible', ?)`,
      [userId, JSON.stringify(defaultDynamic)]
    );

    return findByUserId(userId);
  }

  const profile = rows[0];
  if (profile.dynamicProfile && typeof profile.dynamicProfile === 'string') {
    try {
      profile.dynamicProfile = JSON.parse(profile.dynamicProfile);
    } catch {
      // Ignorar si ya viene como objeto
    }
  }

  return profile;
};

/**
 * Guarda o actualiza las respuestas del cuestionario y recalcula el perfil dinámico.
 */
export const savePreferences = async (userId, data) => {
  const stepByStepPref = Math.min(5, Math.max(1, Number(data.stepByStepPref || 3)));
  const problemSolvingPref = Math.min(5, Math.max(1, Number(data.problemSolvingPref || 3)));
  const conceptMapsPref = Math.min(5, Math.max(1, Number(data.conceptMapsPref || 3)));
  const questioningPref = Math.min(5, Math.max(1, Number(data.questioningPref || 3)));
  const spacedRepetitionPref = Math.min(5, Math.max(1, Number(data.spacedRepetitionPref || 3)));
  const preferredSessionLength = Math.min(240, Math.max(10, Number(data.preferredSessionLength || 25)));
  const breakFrequencyMinutes = Math.min(60, Math.max(2, Number(data.breakFrequencyMinutes || 5)));
  const preferredStudyTime = data.preferredStudyTime || 'flexible';
  const weeklyGoalMinutes = Number(data.weeklyGoalMinutes || 420);

  // Calcular el perfil dinámico multidimensional
  const dynamicProfile = calculateDynamicProfile({
    stepByStepPref,
    problemSolvingPref,
    conceptMapsPref,
    questioningPref,
    spacedRepetitionPref,
    preferredSessionLength,
    breakFrequencyMinutes,
    preferredStudyTime,
  });

  const dynamicJson = JSON.stringify(dynamicProfile);

  await pool.execute(
    `INSERT INTO learning_preferences
       (user_id, step_by_step_pref, problem_solving_pref, concept_maps_pref,
        questioning_pref, spaced_repetition_pref, break_frequency_minutes,
        preferred_session_length, preferred_study_time, weekly_goal_minutes,
        pomodoro_work_minutes, pomodoro_break_minutes, dynamic_profile)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       step_by_step_pref = VALUES(step_by_step_pref),
       problem_solving_pref = VALUES(problem_solving_pref),
       concept_maps_pref = VALUES(concept_maps_pref),
       questioning_pref = VALUES(questioning_pref),
       spaced_repetition_pref = VALUES(spaced_repetition_pref),
       break_frequency_minutes = VALUES(break_frequency_minutes),
       preferred_session_length = VALUES(preferred_session_length),
       preferred_study_time = VALUES(preferred_study_time),
       weekly_goal_minutes = VALUES(weekly_goal_minutes),
       pomodoro_work_minutes = VALUES(preferred_session_length),
       pomodoro_break_minutes = VALUES(break_frequency_minutes),
       dynamic_profile = VALUES(dynamic_profile)`,
    [
      userId,
      stepByStepPref,
      problemSolvingPref,
      conceptMapsPref,
      questioningPref,
      spacedRepetitionPref,
      breakFrequencyMinutes,
      preferredSessionLength,
      preferredStudyTime,
      weeklyGoalMinutes,
      preferredSessionLength,
      breakFrequencyMinutes,
      dynamicJson,
    ]
  );

  return findByUserId(userId);
};
