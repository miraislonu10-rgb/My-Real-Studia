/**
 * STUDIA - Middleware de validacion de formularios
 * ------------------------------------------------------------------
 * Ejecuta las cadenas de express-validator y, si hay errores, responde con
 * 422 y el detalle por campo. Los controladores ya reciben datos saneados.
 */

import { validationResult } from 'express-validator';
import { AppError } from '../utils/errors.js';

export const validate = (chains) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array().map((item) => ({
      field: item.path,
      message: item.msg,
    }));

    return next(AppError.validation('Datos invalidos. Revisa los campos marcados.', details));
  },
];

export default validate;
