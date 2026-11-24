/**
 * STUDIA - Validadores de temas
 * ------------------------------------------------------------------
 * Se ejecutan antes del controlador y sanean los datos. Los nombres de campo
 * siguen el formato JSON (camelCase) que consume el frontend.
 */

import { body, param, query } from 'express-validator';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const STATUSES = ['pending', 'in_progress', 'mastered', 'needs_review'];

const difficultyRule = (optional = true) =>
  (optional ? body('difficultyLevel').optional() : body('difficultyLevel'))
    .isIn(DIFFICULTIES)
    .withMessage('La dificultad debe ser easy, medium o hard.');

const statusRule = (optional = true) =>
  (optional ? body('status').optional() : body('status'))
    .isIn(STATUSES)
    .withMessage('El estado debe ser pending, in_progress, mastered o needs_review.');

/** Creacion de un tema. `subjectId` y `name` son obligatorios. */
export const createTopicValidator = [
  body('subjectId')
    .isInt({ min: 1 })
    .withMessage('La materia indicada no es valida.')
    .toInt(),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del tema es obligatorio.')
    .isLength({ max: 150 })
    .withMessage('El nombre no puede superar 150 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  difficultyRule(),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La prioridad debe estar entre 1 y 5.')
    .toInt(),
  statusRule(),
  body('progressPercent')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('El progreso debe estar entre 0 y 100.')
    .toInt(),
  body('estimatedMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Los minutos estimados deben ser mayores que 0.')
    .toInt(),
  body('userUuid')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('El usuario indicado no es valido.'),
];

/** Actualizacion: todos los campos son opcionales. */
export const updateTopicValidator = [
  body('subjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La materia indicada no es valida.')
    .toInt(),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del tema es obligatorio.')
    .isLength({ max: 150 })
    .withMessage('El nombre no puede superar 150 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  difficultyRule(),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La prioridad debe estar entre 1 y 5.')
    .toInt(),
  statusRule(),
  body('progressPercent')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('El progreso debe estar entre 0 y 100.')
    .toInt(),
  body('estimatedMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Los minutos estimados deben ser mayores que 0.')
    .toInt(),
];

/** El id numerico del tema. */
export const topicIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
];

/** Filtros del listado. */
export const listTopicsValidator = [
  query('subjectId').optional().isInt({ min: 1 }).withMessage('La materia no es valida.').toInt(),
  query('status').optional().isIn(STATUSES).withMessage('El estado no es valido.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('userUuid').optional({ values: 'falsy' }).isUUID().withMessage('El usuario indicado no es valido.'),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

export default {
  createTopicValidator,
  updateTopicValidator,
  topicIdParamValidator,
  listTopicsValidator,
};
