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
