/**
 * STUDIA - Validadores de recursos educativos
 * ------------------------------------------------------------------
 * Se ejecutan antes del controlador y sanean los datos. Los nombres de campo
 * siguen el formato JSON (camelCase) que consume el frontend.
 */

import { body, param, query } from 'express-validator';

const RESOURCE_TYPES = ['link', 'article', 'video', 'book', 'document', 'course', 'other'];
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

const resourceTypeRule = (optional = true) =>
  (optional ? body('resourceType').optional() : body('resourceType'))
    .isIn(RESOURCE_TYPES)
    .withMessage('El tipo de recurso no es valido.');

const difficultyRule = (optional = true) =>
  (optional ? body('difficultyLevel').optional() : body('difficultyLevel'))
    .isIn(DIFFICULTY_LEVELS)
    .withMessage('La dificultad debe ser easy, medium o hard.');

/** Creacion de un recurso. `title` y `url` son obligatorios. */
export const createResourceValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El titulo del recurso es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El titulo no puede superar 200 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  resourceTypeRule(),
  body('url')
    .trim()
    .notEmpty()
    .withMessage('La URL del recurso es obligatoria.')
    .isURL()
    .withMessage('La URL no es valida.')
    .isLength({ max: 500 })
    .withMessage('La URL no puede superar 500 caracteres.'),
  body('provider').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('area').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  difficultyRule(),
  body('language').optional({ values: 'falsy' }).trim().isLength({ max: 5 }),
  body('isPublished').optional().isBoolean().withMessage('El estado de publicacion no es valido.').toBoolean(),
];

/** Actualizacion: todos los campos son opcionales. */
export const updateResourceValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El titulo del recurso es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El titulo no puede superar 200 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  resourceTypeRule(),
  body('url')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La URL del recurso es obligatoria.')
    .isURL()
    .withMessage('La URL no es valida.')
    .isLength({ max: 500 })
    .withMessage('La URL no puede superar 500 caracteres.'),
  body('provider').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('area').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  difficultyRule(),
  body('language').optional({ values: 'falsy' }).trim().isLength({ max: 5 }),
  body('isPublished').optional().isBoolean().withMessage('El estado de publicacion no es valido.').toBoolean(),
];

/** El id numerico del recurso. */
export const resourceIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
];

/** Filtros del listado. */
export const listResourcesValidator = [
  query('resourceType').optional().isIn(RESOURCE_TYPES).withMessage('El tipo de recurso no es valido.'),
  query('area').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  query('isPublished')
    .optional()
    .isBoolean()
    .withMessage('El estado de publicacion no es valido.')
    .toBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

export default {
  createResourceValidator,
  updateResourceValidator,
  resourceIdParamValidator,
  listResourcesValidator,
};
