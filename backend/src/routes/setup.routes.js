/**
 * STUDIA - Rutas de la configuracion inicial (/api/setup)
 * ------------------------------------------------------------------
 * Ambas rutas son publicas por necesidad: se ejecutan antes de que exista
 * cualquier cuenta con la que iniciar sesion. El endpoint de creacion aplica
 * un limite de peticiones y las mismas validaciones que el resto de la API, y
 * el servicio solo permite la operacion mientras no exista ningun admin.
 */

import { Router } from 'express';

import * as setupController from '../controllers/setup.controller.js';
import { validate } from '../middlewares/validate.js';
import { authRateLimiter } from '../middlewares/rateLimiters.js';
import { firstAdminValidator } from '../validators/setup.validators.js';

const router = Router();

// Estado de la configuracion inicial (publico y de solo lectura).
router.get('/status', setupController.getStatus);

// Creacion del primer administrador (limitado por IP y validado).
router.post(
  '/first-admin',
  authRateLimiter,
  validate(firstAdminValidator),
  setupController.createFirstAdmin
);

export default router;
