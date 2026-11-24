/**
 * STUDIA - Firma y verificacion de tokens JWT (token de acceso)
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

const ISSUER = 'studia-api';
const AUDIENCE = 'studia-web';

/**
 * Firma el token de acceso de un usuario.
 * @param {{id:number|string, role:string}} user
 * @returns {string}
 */
export const signAccessToken = (user) =>
  jwt.sign(
    { sub: String(user.id), role: user.role, type: 'access' },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn, issuer: ISSUER, audience: AUDIENCE }
  );

/**
 * Verifica un token de acceso y devuelve su payload.
 * @throws {AppError} 401 si el token es invalido, expirado o de otro tipo.
 * @returns {{sub:string, role:string, type:string, iat:number, exp:number}}
 */
export const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwt.secret, { issuer: ISSUER, audience: AUDIENCE });
    if (payload.type !== 'access') throw new Error('Tipo de token incorrecto');
    return payload;
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    throw AppError.unauthorized(expired ? 'La sesion ha expirado.' : 'Token de acceso invalido.');
  }
};
