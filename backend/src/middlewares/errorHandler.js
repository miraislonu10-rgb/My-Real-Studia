/**
 * STUDIA - Middleware de manejo centralizado de errores
 * ------------------------------------------------------------------
 * Todas las respuestas de error conservan la misma forma:
 *   { success, error, message, data }
 *
 * Reconoce:
 *   - AppError (errores controlados lanzados por servicios y middlewares)
 *   - Errores conocidos de MySQL/MariaDB (codigos ER_*)
 */

import { isProduction } from '../config/env.js';

// Errores conocidos de MySQL que conviene traducir a respuestas claras
const MYSQL_ERRORS = {
  ER_DUP_ENTRY: { status: 409, message: 'El registro ya existe (valor duplicado).' },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'La referencia indicada no existe.' },
  ER_ROW_IS_REFERENCED_2: { status: 409, message: 'El registro tiene datos relacionados y no puede eliminarse.' },
  ER_DATA_TOO_LONG: { status: 422, message: 'Uno de los campos supera la longitud permitida.' },
  WARN_DATA_TRUNCATED: { status: 422, message: 'Uno de los valores enviados no es valido.' },
  ECONNREFUSED: { status: 503, message: 'No hay conexion con la base de datos MySQL/MariaDB.' },
  PROTOCOL_CONNECTION_LOST: { status: 503, message: 'La conexion con la base de datos se interrumpio.' },
  ER_ACCESS_DENIED_ERROR: { status: 503, message: 'Credenciales de base de datos incorrectas.' },
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  const mapped = MYSQL_ERRORS[error.code];
  const isOperational = error.isOperational === true || Boolean(mapped);

  const status = mapped?.status || error.status || 500;
  const code = error.code || error.name || 'INTERNAL_SERVER_ERROR';
  const message =
    mapped?.message ||
    (isOperational ? error.message : 'Error interno del servidor. Intenta de nuevo mas tarde.');

  if (!isProduction) {
    console.error(`[err]  ${req.method} ${req.originalUrl} -> ${status} ${code}: ${error.message}`);
  } else {
    console.error(`[err]  ${req.method} ${req.originalUrl} -> ${status} ${code}`);
  }

  res.status(status).json({
    success: false,
    error: code,
    message,
    data: null,
    ...(error.details ? { details: error.details } : {}),
    ...(isProduction ? {} : { stack: error.stack }),
  });
};

export default errorHandler;
