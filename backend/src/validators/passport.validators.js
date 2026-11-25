/**
 * STUDIA - Validadores del pasaporte academico (passport)
 * ------------------------------------------------------------------
 * Valida las entradas manuales del pasaporte (habilidades, proyectos,
 * certificaciones y logros).
 */

import { body, param } from 'express-validator';

/** Tipos de entrada admitidos por el ENUM de `passport_entries`. */
const ENTRY_TYPES = ['skill', 'project', 'certification', 'achievement'];

/** Campos comunes de una entrada. En edicion todos son opcionales. */
const entryFields = (optional = false) => [
  optional
    ? body('entryType').optional().isIn(ENTRY_TYPES).withMessage('El tipo de entrada no es valido.')
    : body('entryType').isIn(ENTRY_TYPES).withMessage('El tipo de entrada no es valido.'),
  optional
    ? body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('El titulo es obligatorio.')
        .isLength({ max: 200 })
        .withMessage('El titulo no puede superar 200 caracteres.')
    : body('title')
        .trim()
        .notEmpty()
        .withMessage('El titulo es obligatorio.')
        .isLength({ max: 200 })
        .withMessage('El titulo no puede superar 200 caracteres.'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La descripcion no puede superar 5000 caracteres.'),
  body('category')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('La categoria no puede superar 120 caracteres.'),
  body('level')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 60 })
    .withMessage('El nivel no puede superar 60 caracteres.'),
  body('link')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('El enlace no puede superar 500 caracteres.'),
  body('dateCompleted')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha de finalizacion no es valida (YYYY-MM-DD).'),
];

export const createEntryValidator = entryFields(false);

export const updateEntryValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
  ...entryFields(true),
];

export const entryIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
];

export default { createEntryValidator, updateEntryValidator, entryIdParamValidator };
