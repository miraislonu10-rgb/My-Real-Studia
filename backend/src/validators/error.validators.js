/**
 * STUDIA - Validadores del diario de errores (errors)
 * ------------------------------------------------------------------
 * Valida los datos de entrada para creacion, edicion y filtrado de errores.
 */

import { body, param, query } from 'express-validator';

const VALID_ERROR_TYPES = [
  'conceptual',
  'procedural',
  'calculation',
  'interpretation',
  'memory',
  'conceptuales',
  'procedimentales',
  'calculo',
  'cálculo',
  'interpretacion',
  'interpretación',
  'memoria',
];

const VALID_STATUSES = [
  'pending',
  'in_review',
  'understood',
  'open',
  'resolved',
  'pendientes',
  'en_revision',
  'comprendidos',
];

export const createErrorValidator = [
  body('exerciseTitle')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('El nombre del ejercicio no puede superar 255 caracteres.'),
  body('subjectId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('La materia seleccionada no es valida.')
    .toInt(),
  body('topicId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('El tema seleccionado no es valido.')
    .toInt(),
  body('userAnswer')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La respuesta proporcionada no puede superar 5000 caracteres.'),
  body('correctAnswer')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La respuesta correcta no puede superar 5000 caracteres.'),
  body('explanation')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La explicacion no puede superar 5000 caracteres.'),
  body('errorType')
    .optional()
    .custom((val) => VALID_ERROR_TYPES.includes(String(val).toLowerCase()))
    .withMessage('El tipo de error debe ser conceptual, procedural, calculation, interpretation o memory.'),
  body('status')
    .optional()
    .custom((val) => VALID_STATUSES.includes(String(val).toLowerCase()))
    .withMessage('El estado debe ser pending, in_review o understood.'),
  body('errorDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha del error debe ser una fecha valida (YYYY-MM-DD).'),
];

export const updateErrorValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identificador de error invalido.')
    .toInt(),
  ...createErrorValidator,
];

export const updateStatusValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identificador de error invalido.')
    .toInt(),
  body('status')
    .notEmpty()
    .withMessage('El nuevo estado es obligatorio.')
    .custom((val) => VALID_STATUSES.includes(String(val).toLowerCase()))
    .withMessage('El estado debe ser pending, in_review o understood.'),
];

export const errorIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del error no es valido.')
    .toInt(),
];

export const listErrorsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('subjectId').optional().isInt({ min: 1 }).toInt(),
  query('errorType')
    .optional()
    .custom((val) => VALID_ERROR_TYPES.includes(String(val).toLowerCase())),
  query('status')
    .optional()
    .custom((val) => VALID_STATUSES.includes(String(val).toLowerCase())),
  query('search').optional().trim(),
  query('from').optional().isISO8601().withMessage('Fecha desde invalida.'),
  query('to').optional().isISO8601().withMessage('Fecha hasta invalida.'),
];
