/**
 * STUDIA - Configuracion central de variables de entorno
 * ------------------------------------------------------------------
 * Todo el acceso a process.env ocurre aqui. Ninguna credencial se escribe
 * directamente en el codigo: los valores viven en el archivo .env (excluido
 * de Git) y se validan al arrancar la aplicacion.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import { toInt, toList, parseDurationMs } from '../utils/duration.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Resuelve un secreto obligatorio.
 *  - En produccion se exige que exista: si falta, assertEnv detiene el arranque.
 *  - En desarrollo, si no se definio, se genera uno efimero para que un clon
 *    recien descargado funcione sin tener que editar el .env. Las sesiones se
 *    invalidan al reiniciar el servidor, algo aceptable en local.
 */
const resolveSecret = (value, name) => {
  if (value) return value;
  if (IS_PRODUCTION) return '';
  console.warn(
    `[env]  ${name} no esta definido: se genero un secreto efimero de desarrollo. ` +
      'Define uno en .env para mantener las sesiones entre reinicios.'
  );
  return crypto.randomBytes(48).toString('hex');
};

export const env = {
  nodeEnv: NODE_ENV,
  port: toInt(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || '/api',
  corsOrigin: toList(process.env.CORS_ORIGIN, 'http://localhost:5173'),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'studia_db',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
  },

  jwt: {
    secret: resolveSecret(process.env.JWT_SECRET, 'JWT_SECRET'),
    /** Vigencia del token de acceso (por ejemplo 15m). */
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    /** Clave HMAC con la que se hashean los tokens de refresco y de recuperacion. */
    refreshSecret: resolveSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
    /** Vigencia del token de refresco (acepta 7d, 12h, 30m...). */
    refreshTtlMs: parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN, SEVEN_DAYS_MS),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  auth: {
    /** Vigencia del enlace de recuperacion de contraseña. */
    passwordResetTtlMs: toInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 60) * 60 * 1000,
    passwordResetTtlMinutes: toInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 60),
    /** Limite especifico para intentos de acceso y recuperacion. */
    rateLimitWindowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, FIVE_MINUTES_MS * 3),
    // En desarrollo se deja un margen amplio para no bloquear las pruebas.
    rateLimitMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, IS_PRODUCTION ? 10 : 100),
    minPasswordLength: toInt(process.env.MIN_PASSWORD_LENGTH, 8),
  },

  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, FIVE_MINUTES_MS * 3),
    // Margen amplio en desarrollo (StrictMode dispara peticiones duplicadas).
    max: toInt(process.env.RATE_LIMIT_MAX, IS_PRODUCTION ? 100 : 1000),
  },

  ai: {
    /**
     * Credenciales del proveedor de IA. Viven exclusivamente en el servidor:
     * nunca se envian al cliente. Si estan vacias, STUDIA AI Companion opera
     * con su motor pedagogico local y lo informa de forma transparente.
     */
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    /** Modelo a utilizar segun el proveedor. */
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    /** Endpoint base compatible con OpenAI (permite proveedores alternativos). */
    openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    /** Tiempo maximo de espera de la API externa antes de abortar (ms). */
    timeoutMs: toInt(process.env.AI_TIMEOUT_MS, 20000),
  },

  mail: {
    /** Adapter de correo: console (desarrollo) o smtp (integracion real). */
    transport: process.env.MAIL_TRANSPORT || 'console',
    from: process.env.MAIL_FROM || 'STUDIA <no-responder@studia.local>',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: toInt(process.env.SMTP_PORT, 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
  },

  passwordResetTtlHoursFallback: ONE_HOUR_MS,
};

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';

/**
 * Valida las variables criticas: en produccion detiene el arranque, en
 * desarrollo solo advierte para no bloquear el trabajo local.
 */
export const assertEnv = () => {
  const missing = [];
  if (!env.jwt.secret) missing.push('JWT_SECRET');
  if (!env.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');
  if (!env.db.name) missing.push('DB_NAME');
  if (!env.frontendUrl) missing.push('FRONTEND_URL');

  if (missing.length === 0) return;

  const message = `Faltan variables de entorno obligatorias: ${missing.join(', ')}`;
  if (isProduction) throw new Error(message);
  console.warn(`[env]  ${message} (revisa tu archivo .env basandote en .env.example)`);
};
