/**
 * STUDIA - Validadores de Inteligencia Artificial (STUDIA AI Companion)
 * ------------------------------------------------------------------
 * Sanea y limita la entrada del asistente antes de enviarla al proveedor de IA.
 * Los textos se recortan y se acotan en longitud para evitar abusos de coste.
 */

import { body } from 'express-validator';

/** Acciones pedagógicas soportadas por el asistente. */
export const AI_ACTIONS = [
  'explain_concept',
  'generate_exercise',
  'provide_hint',
  'explain_wrong_answer',
  'analyze_frequent_errors',
  'recommend_theory',
  'personalized_review',
  'general_help',
];

export const companionValidator = [
  body('action')
    .optional()
    .isIn(AI_ACTIONS)
    .withMessage(`La acción debe ser una de: ${AI_ACTIONS.join(', ')}.`),
  body('prompt')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 4000 })
    .withMessage('La consulta no puede superar los 4000 caracteres.'),
  body('subjectName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 150 })
    .withMessage('El nombre de la materia es demasiado largo.'),
  body('topicName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 150 })
    .withMessage('El nombre del tema es demasiado largo.'),
  body('exerciseText')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 4000 })
    .withMessage('El enunciado no puede superar los 4000 caracteres.'),
  body('userAnswer')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La respuesta proporcionada es demasiado larga.'),
  body('correctAnswer')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La respuesta correcta es demasiado larga.'),
];

/** Dificultades admitidas por los ejercicios generados (ENUM de `exercises`). */
const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Note-to-Quiz: valida los apuntes y el destino (materia/tema) del cuestionario.
 * Los apuntes se acotan en longitud para no enviar textos desmesurados a la IA.
 */
export const noteToQuizValidator = [
  body('notes')
    .trim()
    .notEmpty()
    .withMessage('Los apuntes son obligatorios.')
    .isLength({ min: 20, max: 8000 })
    .withMessage('Los apuntes deben tener entre 20 y 8000 caracteres.'),
  body('subjectId')
    .isInt({ min: 1 })
    .withMessage('La materia es obligatoria.')
    .toInt(),
  body('topicId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('El tema indicado no es valido.')
    .toInt(),
  body('subjectName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 150 })
    .withMessage('El nombre de la materia es demasiado largo.'),
  body('topicName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 150 })
    .withMessage('El nombre del tema es demasiado largo.'),
  body('questionCount')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('El numero de preguntas debe estar entre 1 y 20.')
    .toInt(),
  body('difficultyLevel')
    .optional()
    .isIn(QUIZ_DIFFICULTIES)
    .withMessage('La dificultad debe ser easy, medium o hard.'),
];
