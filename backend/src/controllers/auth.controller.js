/**
 * STUDIA - Controlador de autenticacion
 * ------------------------------------------------------------------
 * Capa HTTP: traduce peticiones a llamadas del servicio y respuestas uniformes.
 * No contiene logica de negocio (esa vive en services/auth.service.js).
 *
 * El token de refresco se entrega en una cookie httpOnly; el token de acceso
 * viaja en el cuerpo de la respuesta para que el frontend lo use en el
 * encabezado Authorization.
 */

import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';
import { setRefreshCookie, clearRefreshCookie, readCookie, REFRESH_COOKIE_NAME } from '../utils/cookies.js';

/** Devuelve el refresh token desde la cookie httpOnly o, en su defecto, del body. */
const resolveRefreshToken = (req) => readCookie(req, REFRESH_COOKIE_NAME) || req.body?.refreshToken || null;

/** Emite la respuesta estandar de sesion (usuario + tokens + cookie). */
const sendSession = (res, status, message, { user, tokens }) => {
  setRefreshCookie(res, tokens.refreshToken, env.jwt.refreshTtlMs);

  return res.status(status).json({
    success: true,
    error: null,
    message,
    data: {
      user,
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
      refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
    },
  });
};

/** POST /api/auth/register - registro publico de estudiantes. */
export const register = async (req, res, next) => {
  try {
    const session = await authService.registerStudent(req.body, req);
    return sendSession(res, 201, 'Cuenta creada correctamente. ¡Bienvenido a STUDIA!', session);
  } catch (error) {
    return next(error);
  }
};

/** POST /api/auth/login - inicio de sesion. */
export const login = async (req, res, next) => {
  try {
    const session = await authService.login(req.body, req);
    return sendSession(res, 200, 'Sesion iniciada correctamente.', session);
  } catch (error) {
    return next(error);
  }
};

/** POST /api/auth/refresh - renueva el token de acceso (con rotacion). */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = resolveRefreshToken(req);
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No hay una sesion activa que renovar.',
        data: null,
      });
    }

    const session = await authService.refreshSession({ refreshToken }, req);
    return sendSession(res, 200, 'Sesion renovada.', session);
  } catch (error) {
    clearRefreshCookie(res);
    return next(error);
  }
};

/** POST /api/auth/logout - cierra la sesion del dispositivo actual. */
export const logout = async (req, res, next) => {
  try {
    await authService.logout({ refreshToken: resolveRefreshToken(req) });
    clearRefreshCookie(res);
    return res.status(200).json({
      success: true,
      error: null,
      message: 'Sesion cerrada correctamente.',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/auth/logout-all - cierra todas las sesiones del usuario. */
export const logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAllSessions(req.user.id);
    clearRefreshCookie(res);
    return res.status(200).json({
      success: true,
      error: null,
      message: 'Se cerraron todas las sesiones activas.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/auth/me - datos del usuario autenticado. */
export const me = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      error: null,
      message: 'Usuario autenticado.',
      data: { user: authService.toPublicUser(req.user) },
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/auth/forgot-password - solicita el enlace de recuperacion. */
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(req.body, req);
    return res.status(200).json({
      success: true,
      error: null,
      message: result.message,
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/auth/reset-password - restablece la contraseña con el token. */
export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    clearRefreshCookie(res);
    return res.status(200).json({
      success: true,
      error: null,
      message: result.message,
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
};
