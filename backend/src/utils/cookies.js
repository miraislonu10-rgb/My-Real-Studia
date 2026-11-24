/**
 * STUDIA - Utilidades de cookies (sin dependencias externas)
 * ------------------------------------------------------------------
 * El token de refresco se envia en una cookie httpOnly:
 *  - httpOnly: JavaScript del navegador no puede leerla (mitiga XSS).
 *  - sameSite=lax: mitiga CSRF en peticiones cruzadas.
 *  - secure: solo por HTTPS en produccion.
 *  - path limitado a /api/auth: no viaja en el resto de peticiones.
 *
 * El token de acceso NO se guarda en cookie: viaja en el encabezado
 * Authorization para no exponerse a CSRF.
 */

import { isProduction } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'studia_refresh_token';

/** Lee una cookie concreta del encabezado Cookie. */
export const readCookie = (req, name) => {
  const header = req.headers?.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return null;
};

/** Escribe la cookie del token de refresco. */
export const setRefreshCookie = (res, token, maxAgeMs) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
};

/** Elimina la cookie del token de refresco. */
export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/api/auth',
  });
};

export default { REFRESH_COOKIE_NAME, readCookie, setRefreshCookie, clearRefreshCookie };
