/**
 * STUDIA - Validadores del modulo de docencia
 */

import { param, query } from 'express-validator';

import { ALLOWED_SORTS } from '../models/teacher.model.js';

/** Listado de estudiantes: busqueda, orden y paginacion. */
export const listStudentsValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 191 }),
  query('sort').optional({ values: 'falsy' }).isIn(ALLOWED_SORTS).withMessage('El criterio de orden no es valido.'),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

/** El uuid publico del estudiante siempre debe tener formato UUID. */
export const studentUuidValidator = [
  param('uuid').isUUID().withMessage('El identificador no es valido.'),
];

export default { listStudentsValidator, studentUuidValidator };
