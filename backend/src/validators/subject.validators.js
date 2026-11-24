/**
 * STUDIA - Validadores de materias
 * ------------------------------------------------------------------
 * Se ejecutan antes del controlador y sanean los datos. Los nombres de campo
 * siguen el formato JSON (camelCase) que consume el frontend.
 */

import { body, param, query } from 'express-validator';

const difficultyRule = (optional = true) =>
  (optional ? body('difficultyLevel').optional() : body('difficultyLevel'))
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('La dificultad debe ser easy, medium o hard.');

const statusRule = (optional = true) =>
  (optional ? body('status').optional() : body('status'))
    .isIn(['active', 'paused', 'archived'])
    .withMessage('El estado debe ser active, paused o archived.');

const colorRule = (optional = true) =>
  (optional ? body('color').optional({ values: 'falsy' }) : body('color'))
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('El color debe tener el formato #RRGGBB.');

/** Creacion de una materia. `name` es obligatorio. */
export const createSubjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la materia es obligatorio.')
    .isLength({ max: 120 })
    .withMessage('El nombre no puede superar 120 caracteres.'),
  body('code').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  colorRule(),
  body('icon').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  difficultyRule(),
  body('teacherName').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('targetHours')
    .optional({ values: 'falsy' })
    .isFloat({ gt: 0, max: 9999 })
    .withMessage('Las horas objetivo deben ser mayores que 0.')
    .toFloat(),
  statusRule(),
  body('userUuid')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('El usuario indicado no es valido.'),
];

/** Actualizacion: todos los campos son opcionales. */
export const updateSubjectValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre de la materia es obligatorio.')
    .isLength({ max: 120 })
    .withMessage('El nombre no puede superar 120 caracteres.'),
  body('code').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  colorRule(),
  body('icon').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  difficultyRule(),
  body('teacherName').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('targetHours')
    .optional({ values: 'falsy' })
    .isFloat({ gt: 0, max: 9999 })
    .withMessage('Las horas objetivo deben ser mayores que 0.')
    .toFloat(),
  statusRule(),
];

/** El id numerico de la materia. */
export const subjectIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
];

/** Filtros del listado. */
export const listSubjectsValidator = [
  query('status').optional().isIn(['active', 'paused', 'archived']).withMessage('El estado no es valido.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  query('userUuid').optional({ values: 'falsy' }).isUUID().withMessage('El usuario indicado no es valido.'),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

export default {
  createSubjectValidator,
  updateSubjectValidator,
  subjectIdParamValidator,
  listSubjectsValidator,
};
