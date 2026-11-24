/**
 * STUDIA - Servicio de datos de ejemplo
 * ------------------------------------------------------------------
 * Rellena una cuenta de estudiante VACIA con contenido de demostracion real
 * (materias, temas, tareas, errores y tarjetas) para que pueda explorar todos
 * los modulos sin tener que introducir datos a mano.
 *
 * Reglas
 *  1. Solo actua si el estudiante no tiene ninguna materia: asi no duplica ni
 *     pisa el contenido que ya haya creado. Si ya tiene materias responde 409.
 *  2. Todo el contenido se asocia al `user_id` de la sesion (anti-IDOR): nunca
 *     se generan datos de otros usuarios.
 *  3. Son datos de relleno identificables (materias "de ejemplo"), no cifras
 *     inventadas que se presenten como resultados reales del estudiante.
 */

import { AppError } from '../utils/errors.js';
import * as subjectModel from '../models/subject.model.js';
import * as topicModel from '../models/topic.model.js';
import * as taskModel from '../models/task.model.js';
import * as errorModel from '../models/error.model.js';
import * as flashcardModel from '../models/flashcard.model.js';

/** Fecha (YYYY-MM-DD) desplazada respecto a hoy. */
const dateOnly = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

/** Fecha y hora (YYYY-MM-DD HH:MM:SS) desplazada respecto a hoy. */
const dateTime = (offsetDays, time = '23:59:00') => `${dateOnly(offsetDays)} ${time}`;

/**
 * Crea el contenido de ejemplo para el estudiante indicado.
 * @param {number} userId
 */
export const seedForUser = async (userId) => {
  if ((await subjectModel.countByUser(userId)) > 0) {
    throw AppError.conflict(
      'Ya tienes materias creadas. Los datos de ejemplo solo pueden cargarse en una cuenta sin contenido.'
    );
  }

  const created = { subjects: 0, topics: 0, tasks: 0, errors: 0, flashcards: 0 };

  // ---------------------------------------------------------- 1. Materias
  const mathId = await subjectModel.create(userId, {
    name: 'Matematicas (ejemplo)',
    code: 'MAT-101',
    description: 'Algebra, ecuaciones y funciones. Materia de ejemplo.',
    color: '#8574d8',
    difficultyLevel: 'medium',
    targetHours: 40,
    status: 'active',
  });
  created.subjects += 1;

  const bioId = await subjectModel.create(userId, {
    name: 'Biologia (ejemplo)',
    code: 'BIO-101',
    description: 'La celula, genetica y ecologia. Materia de ejemplo.',
    color: '#4fb783',
    difficultyLevel: 'medium',
    targetHours: 30,
    status: 'active',
  });
  created.subjects += 1;

  // -------------------------------------------------------------- 2. Temas
  const eqTopic = await topicModel.create(userId, {
    subjectId: mathId,
    name: 'Ecuaciones de primer grado',
    difficultyLevel: 'easy',
    priority: 1,
    status: 'in_progress',
    progressPercent: 40,
    estimatedMinutes: 120,
  });
  created.topics += 1;

  const fnTopic = await topicModel.create(userId, {
    subjectId: mathId,
    name: 'Funciones lineales',
    difficultyLevel: 'medium',
    priority: 3,
    status: 'pending',
    progressPercent: 0,
    estimatedMinutes: 150,
  });
  created.topics += 1;

  const cellTopic = await topicModel.create(userId, {
    subjectId: bioId,
    name: 'La celula',
    difficultyLevel: 'easy',
    priority: 2,
    status: 'mastered',
    progressPercent: 100,
    estimatedMinutes: 90,
  });
  created.topics += 1;

  const geneticsTopic = await topicModel.create(userId, {
    subjectId: bioId,
    name: 'Genetica basica',
    difficultyLevel: 'medium',
    priority: 3,
    status: 'in_progress',
    progressPercent: 30,
    estimatedMinutes: 180,
  });
  created.topics += 1;

  // ------------------------------------------------------------ 3. Tareas
  const tasks = [
    {
      subjectId: mathId,
      topicId: eqTopic,
      title: 'Resolver los ejercicios 1-10 de ecuaciones',
      priority: 'high',
      status: 'pending',
      dueDate: dateTime(1, '20:00:00'),
      scheduledDate: dateOnly(0),
      scheduledStartTime: '15:00:00',
      scheduledEndTime: '16:00:00',
      estimatedMinutes: 60,
    },
    {
      subjectId: mathId,
      topicId: fnTopic,
      title: 'Resumen del capitulo de funciones lineales',
      priority: 'medium',
      status: 'pending',
      dueDate: dateTime(3, '23:59:00'),
      estimatedMinutes: 45,
    },
    {
      subjectId: bioId,
      topicId: cellTopic,
      title: 'Esquema de las partes de la celula',
      priority: 'low',
      status: 'pending',
      dueDate: dateTime(2, '23:59:00'),
      goalPeriod: 'daily',
      estimatedMinutes: 30,
    },
    {
      subjectId: mathId,
      topicId: eqTopic,
      title: 'Repasar ecuaciones antes del examen',
      priority: 'urgent',
      status: 'pending',
      dueDate: dateTime(-1, '23:59:00'),
      estimatedMinutes: 50,
    },
    {
      subjectId: bioId,
      topicId: geneticsTopic,
      title: 'Leer el tema de genetica basica',
      priority: 'medium',
      status: 'pending',
      dueDate: dateTime(5, '23:59:00'),
      goalPeriod: 'weekly',
      estimatedMinutes: 60,
    },
    {
      subjectId: bioId,
      topicId: cellTopic,
      title: 'Cuestionario de repaso de la celula',
      priority: 'low',
      status: 'completed',
      dueDate: dateTime(-2, '23:59:00'),
      estimatedMinutes: 25,
    },
  ];

  for (const task of tasks) {
    await taskModel.create(userId, task);
    created.tasks += 1;
  }

  // ------------------------------------------------------------ 4. Errores
  const errors = [
    {
      subjectId: mathId,
      topicId: eqTopic,
      title: 'Confundi el signo al despejar la incognita',
      description: 'Al pasar un termino al otro lado cambie el signo incorrectamente.',
      userAnswer: 'x = 5',
      correctAnswer: 'x = -5',
      errorType: 'conceptual',
      severity: 'medium',
      status: 'pending',
    },
    {
      subjectId: mathId,
      topicId: fnTopic,
      title: 'Olvide la formula de la pendiente',
      description: 'No recorde como calcular la pendiente entre dos puntos.',
      errorType: 'memory',
      severity: 'low',
      status: 'in_review',
    },
    {
      subjectId: bioId,
      topicId: geneticsTopic,
      title: 'Confundi gen dominante con recesivo',
      description: 'Interprete mal el resultado de un cruce genetico.',
      errorType: 'conceptual',
      severity: 'high',
      status: 'pending',
    },
  ];

  for (const error of errors) {
    await errorModel.create(userId, error);
    created.errors += 1;
  }

  // --------------------------------------------------------- 5. Tarjetas
  const flashcards = [
    {
      subjectId: mathId,
      topicId: eqTopic,
      frontText: 'Ecuacion general de primer grado',
      backText: 'ax + b = 0, con a distinto de 0. Solucion: x = -b / a.',
      hint: 'Despeja la incognita.',
      difficultyLevel: 'easy',
    },
    {
      subjectId: mathId,
      topicId: fnTopic,
      frontText: 'Formula de la pendiente entre dos puntos',
      backText: 'm = (y2 - y1) / (x2 - x1).',
      difficultyLevel: 'medium',
    },
    {
      subjectId: bioId,
      topicId: cellTopic,
      frontText: 'Funcion principal de la mitocondria',
      backText: 'Producir energia (ATP) mediante la respiracion celular.',
      difficultyLevel: 'easy',
    },
    {
      subjectId: bioId,
      topicId: geneticsTopic,
      frontText: 'Que es un gen dominante?',
      backText: 'Aquel que se manifiesta en el fenotipo aunque solo haya una copia.',
      difficultyLevel: 'medium',
      source: 'from_error',
    },
  ];

  for (const card of flashcards) {
    await flashcardModel.create(userId, card);
    created.flashcards += 1;
  }

  return {
    created,
    message: `Se cargaron datos de ejemplo: ${created.subjects} materias, ${created.topics} temas, ${created.tasks} tareas, ${created.errors} errores y ${created.flashcards} tarjetas.`,
  };
};

export default { seedForUser };
