/**
 * STUDIA - Middleware de autenticacion y autorizacion
 * ------------------------------------------------------------------
 * authenticate:
 *   1. Lee el token de acceso del encabezado "Authorization: Bearer <token>".
 *   2. Verifica su firma, emisor, audiencia y expiracion (ver utils/jwt.js).
 *   3. Vuelve a consultar el usuario en la base de datos y adjunta SOLO las
 *      columnas publicas a req.user.
 *
 * Por que se recarga el usuario desde la base:
 *   - El rol NO se toma del token, se lee de la base. Si un administrador
 *     suspende o degrada una cuenta, el cambio surte efecto de inmediato sin
 *     esperar a que caduque el token.
 *   - Si la cuenta fue borrada o suspendida, la peticion se rechaza.
 *
 * authorize(...roles):
 *   Restringe la ruta a los roles indicados (control de acceso basado en rol).
 */

import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import * as userModel from '../models/user.model.js';

/** Extrae el token de un encabezado "Bearer <token>". */
const extractBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
};

/**
 * Carga el usuario autenticado y lo deja en req.user.
 * @throws {AppError} 401 si no hay token valido; 403 si la cuenta no esta activa.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw AppError.unauthorized('Debes iniciar sesion para acceder a este recurso.');
    }

    const payload = verifyAccessToken(token);

    const user = await userModel.findById(payload.sub);
    if (!user) {
      throw AppError.unauthorized('La cuenta asociada a esta sesion ya no existe.');
    }

    if (user.status === 'deleted' || user.status === 'suspended') {
      throw AppError.forbidden('La cuenta esta suspendida o eliminada. Contacta al administrador.');
    }

    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Middleware de autorizacion basado en roles.
 * Debe usarse SIEMPRE despues de authenticate.
 * @param {...string} allowedRoles
 */
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Debes iniciar sesion para acceder a este recurso.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('No tienes permisos para acceder a este recurso.'));
    }

    return next();
  };

/** Azucar sintactico: solo administradores. */
export const requireAdmin = authorize('admin');

/** Azucar sintactico: estudiantes. */
export const requireStudent = authorize('student');

/**
 * Azucar sintactico: docentes.
 * El panel de docencia es de solo lectura (ver rutas /api/teacher) y sirve
 * tanto al administrador como al rol tutor para acompanar a los alumnos.
 */
export const requireTeacher = authorize('admin', 'tutor');

/**
 * Autenticacion opcional: si hay token valido adjunta req.user; si no,
 * continua como invitado. Util en endpoints publicos personalizables.
 */
export const optionalAuth = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await userModel.findById(payload.sub);
    if (user && user.status === 'active') {
      req.user = user;
      req.tokenPayload = payload;
    }
  } catch {
    // Un token invalido en una ruta opcional no interrumpe la peticion.
  }
  return next();
};

export default { authenticate, authorize, requireAdmin, requireStudent, requireTeacher, optionalAuth };
