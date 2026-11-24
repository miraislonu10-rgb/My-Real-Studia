/**
 * STUDIA - Utilidades criptograficas
 * ------------------------------------------------------------------
 * Puntos clave de seguridad:
 *  - Las contraseñas se hashean con bcrypt (salt aleatorio por usuario).
 *  - Los tokens de sesion y de recuperacion son aleatorios (no predecibles).
 *  - En la base de datos solo se guarda el HMAC-SHA256 del token, nunca el
 *    token en claro: si alguien lee la tabla no puede suplantar la sesion.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

/** Genera el hash bcrypt de una contraseña en texto plano. */
export const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, env.bcryptSaltRounds);

/**
 * Compara una contraseña en texto plano con su hash.
 * @returns {Promise<boolean>}
 */
export const verifyPassword = (plainPassword, passwordHash) => bcrypt.compare(plainPassword, passwordHash);

/** Genera un token aleatorio criptograficamente seguro (hex). */
export const generateToken = (bytes = 48) => crypto.randomBytes(bytes).toString('hex');

/**
 * Calcula el HMAC-SHA256 de un token usando JWT_REFRESH_SECRET como clave.
 * Es determinista, por lo que permite buscar por indice en la base de datos.
 */
export const hashToken = (token) =>
  crypto.createHmac('sha256', env.jwt.refreshSecret).update(token).digest('hex');

/** Compara dos cadenas en tiempo constante (evita ataques de temporizacion). */
export const safeCompare = (a, b) => {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

/** Fecha MySQL (DATETIME) resultante de sumar milisegundos al momento actual. */
export const mysqlDateAfter = (milliseconds) =>
  new Date(Date.now() + milliseconds).toISOString().slice(0, 19).replace('T', ' ');

/** Fecha MySQL (DATETIME) del momento actual en UTC. */
export const mysqlNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
