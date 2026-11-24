/**
 * STUDIA - Validadores de ejercicios de practica
 * ------------------------------------------------------------------
 * Se ejecutan antes del controlador y sanean los datos. Los nombres de campo
 * siguen el formato JSON (camelCase) que consume el frontend.
 */

import { body, param, query } from 'express-validator';

const EXERCISE_TYPES = ['multiple_choice', 'open_answer', 'true_false', 'problem_solving', 'coding'];
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

const exerciseTypeRule = (optional = true) =>
  (optional ? body('exerciseType').optional() : body('exerciseType'))
    .isIn(EXERCISE_TYPES)
    .withMessage('El tipo de ejercicio no es valido.');

const difficultyRule = (optional = true) =>
  (optional ? body('difficultyLevel').optional() : body('difficultyLevel'))
    .isIn(DIFFICULTY_LEVELS)
    .withMessage('La dificultad debe ser easy, medium o hard.');

// `options` acepta un arreglo o un objeto JSON (o null/undefined).
const optionsRule = (optional = true) =>
  (optional ? body('options').optional() : body('options'))
    .custom((value) => Array.isArray(value) || (value !== null && typeof value === 'object'))
    .withMessage('Las opciones deben ser un arreglo o un objeto JSON.');

/** Creacion de un ejercicio. `subjectId`, `title` y `statement` son obligatorios. */
export const createExerciseValidator = [
  body('subjectId')
    .isInt({ min: 1 })
    .withMessage('La materia es obligatoria.')
    .toInt(),
  body('topicId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('El tema indicado no es valido.')
    .toInt(),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El titulo del ejercicio es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El titulo no puede superar 200 caracteres.'),
  body('statement')
    .trim()
    .notEmpty()
    .withMessage('El enunciado del ejercicio es obligatorio.'),
  exerciseTypeRule(),
  difficultyRule(),
  body('source').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  optionsRule(),
  body('correctAnswer').optional(),
  body('solution').optional(),
  body('timeLimitSeconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El tiempo limite debe ser mayor que 0.')
    .toInt(),
  body('isActive').optional().isBoolean().withMessage('El estado activo no es valido.').toBoolean(),
  body('userUuid')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('El usuario indicado no es valido.'),
];

/** Actualizacion: todos los campos son opcionales. */
export const updateExerciseValidator = [
  body('subjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La materia indicada no es valida.')
    .toInt(),
  body('topicId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('El tema indicado no es valido.')
    .toInt(),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El titulo del ejercicio es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El titulo no puede superar 200 caracteres.'),
  body('statement')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El enunciado del ejercicio es obligatorio.'),
  exerciseTypeRule(),
  difficultyRule(),
  body('source').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  optionsRule(),
  body('correctAnswer').optional(),
  body('solution').optional(),
  body('timeLimitSeconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El tiempo limite debe ser mayor que 0.')
    .toInt(),
  body('isActive').optional().isBoolean().withMessage('El estado activo no es valido.').toBoolean(),
];

/** El id numerico del ejercicio. */
export const exerciseIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
];

/** Filtros del listado. */
export const listExercisesValidator = [
  query('subjectId').optional().isInt({ min: 1 }).withMessage('La materia no es valida.').toInt(),
  query('topicId').optional().isInt({ min: 1 }).withMessage('El tema no es valido.').toInt(),
  query('exerciseType').optional().isIn(EXERCISE_TYPES).withMessage('El tipo de ejercicio no es valido.'),
  query('difficultyLevel').optional().isIn(DIFFICULTY_LEVELS).withMessage('La dificultad no es valida.'),
  query('isActive').optional().isBoolean().withMessage('El estado activo no es valido.').toBoolean(),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  query('userUuid').optional({ values: 'falsy' }).isUUID().withMessage('El usuario indicado no es valido.'),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

export default {
  createExerciseValidator,
  updateExerciseValidator,
  exerciseIdParamValidator,
  listExercisesValidator,
};
