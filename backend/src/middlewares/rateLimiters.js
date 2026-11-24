/**
 * STUDIA - Limitador de peticiones para autenticacion
 * ------------------------------------------------------------------
 * Mitiga la fuerza bruta y el abuso en los endpoints sensibles (registro,
 * inicio de sesion y recuperacion de contraseña).
 *
 * El limite se controla desde el archivo .env:
 *   AUTH_RATE_LIMIT_WINDOW_MS  (por defecto 900000 = 15 minutos)
 *   AUTH_RATE_LIMIT_MAX        (por defecto 10 intentos por ventana e IP)
 *
 * Durante el desarrollo puede subirse AUTH_RATE_LIMIT_MAX si las pruebas
 * repetidas activan el limite.
 */

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: env.auth.rateLimitWindowMs,
  limit: env.auth.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
    data: null,
  },
});

export default authRateLimiter;
