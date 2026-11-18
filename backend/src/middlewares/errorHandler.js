/**
 * STUDIA - Middleware de manejo centralizado de errores
 * ------------------------------------------------------------------
 * Todas las respuestas de error conservan la misma forma:
 *   { success, error, message, data }
 */

import { isProduction } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  const status = error.status || 500;

  // Errores conocidos de MySQL que conviene traducir a respuestas claras
  const mysqlErrors = {
    ER_DUP_ENTRY: { status: 409, message: 'El registro ya existe (valor duplicado).' },
    ER_NO_REFERENCED_ROW_2: { status: 400, message: 'La referencia indicada no existe.' },
    ER_ROW_IS_REFERENCED_2: { status: 409, message: 'El registro tiene datos relacionados y no puede eliminarse.' },
    ECONNREFUSED: { status: 503, message: 'No hay conexion con la base de datos MySQL/MariaDB.' },
  };

  const mapped = mysqlErrors[error.code];

  console.error(`[err]  ${req.method} ${req.originalUrl} ->`, error.message);

  res.status(mapped?.status || status).json({
    success: false,
    error: error.code || error.name || 'INTERNAL_SERVER_ERROR',
    message: mapped?.message || error.message || 'Error interno del servidor.',
    data: null,
    ...(isProduction ? {} : { stack: error.stack }),
  });
};

export default errorHandler;
