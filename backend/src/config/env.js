/**
 * STUDIA - Configuracion central de variables de entorno
 * ------------------------------------------------------------------
 * Todo el acceso a process.env ocurre aqui. El resto del codigo importa
 * el objeto `env`, de modo que exista una unica fuente de verdad.
 */

import 'dotenv/config';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value, fallback) =>
  (value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || '/api',
  corsOrigin: toList(process.env.CORS_ORIGIN, 'http://localhost:5173'),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'studia_db',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
  },
};

export const isProduction = env.nodeEnv === 'production';

/**
 * Valida que las variables criticas existan. En produccion detiene el arranque;
 * en desarrollo solo advierte, para no bloquear el trabajo local.
 */
export const assertEnv = () => {
  const missing = [];
  if (!env.jwt.secret) missing.push('JWT_SECRET');
  if (!env.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');
  if (!env.db.name) missing.push('DB_NAME');

  if (missing.length === 0) return;

  const message = `Faltan variables de entorno obligatorias: ${missing.join(', ')}`;
  if (isProduction) throw new Error(message);
  console.warn(`[env]  ${message} (revisa tu archivo .env basandote en .env.example)`);
};
