/**
 * STUDIA - Rutas de autenticacion (/api/auth)
 * ------------------------------------------------------------------
 * Cada endpoint combina, en este orden:
 *   limite de peticiones  ->  validacion de formulario  ->  controlador
 * Las rutas privadas añaden el middleware `authenticate`.
 */

import { Router } from 'express';

import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/rateLimiters.js';
import {
  registerValidator,
  loginValidator,
  refreshValidator,
  logoutValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/auth.validators.js';

const router = Router();

// Registro publico (solo crea estudiantes)
router.post('/register', authRateLimiter, validate(registerValidator), authController.register);

// Inicio de sesion
router.post('/login', authRateLimiter, validate(loginValidator), authController.login);

// Renovacion de sesion con rotacion del token de refresco
router.post('/refresh', authRateLimiter, validate(refreshValidator), authController.refresh);

// Cierre de sesion (idempotente)
router.post('/logout', validate(logoutValidator), authController.logout);

// Cierre de sesion en todos los dispositivos (requiere sesion activa)
router.post('/logout-all', authenticate, authController.logoutAll);

// Datos del usuario autenticado
router.get('/me', authenticate, authController.me);

// Recuperacion de contraseña
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordValidator), authController.resetPassword);

export default router;
