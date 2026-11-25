/**
 * STUDIA - Validadores del Error DNA (error-dna)
 * ------------------------------------------------------------------
 * Solo se filtran por rango de fechas; el analisis es de lectura.
 */

import { query } from 'express-validator';

export const errorDnaQueryValidator = [
  query('from').optional().isISO8601().withMessage('La fecha desde no es valida (YYYY-MM-DD).'),
  query('to').optional().isISO8601().withMessage('La fecha hasta no es valida (YYYY-MM-DD).'),
];

export default { errorDnaQueryValidator };
