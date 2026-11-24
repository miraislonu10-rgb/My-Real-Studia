/**
 * STUDIA - Errores de aplicacion
 * ------------------------------------------------------------------
 * Permiten que los servicios lancen errores con su codigo HTTP y que el
 * middleware de errores los traduzca a una respuesta uniforme.
 */

export class AppError extends Error {
  /**
   * @param {string} message Mensaje visible para el cliente.
   * @param {number} status Codigo HTTP.
   * @param {string} code Codigo estable para el cliente.
   * @param {object} [details] Informacion adicional (por ejemplo errores de validacion).
   */
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Solicitud invalida.', details) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static validation(message = 'Datos invalidos.', details) {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'No autenticado.') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'No tienes permisos para realizar esta accion.') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Recurso no encontrado.') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'El recurso ya existe.', details) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static tooManyRequests(message = 'Demasiadas solicitudes.') {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static serviceUnavailable(message = 'Servicio no disponible.') {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export default AppError;
