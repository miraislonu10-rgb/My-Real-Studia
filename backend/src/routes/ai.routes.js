/**
 * STUDIA - Rutas de Inteligencia Artificial (/api/ai)
 * ------------------------------------------------------------------
 * Requieren autenticación y cuentan con limitador de tasa de peticiones.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { companionValidator } from '../validators/ai.validators.js';

const router = Router();

router.use(authenticate);

// Limitador de tasa para proteger costes y evitar abuso de peticiones de IA
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 20, // máximo 20 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_AI_REQUESTS',
    message: 'Demasiadas consultas de IA. Espera un momento antes de volver a preguntar.',
    data: null,
  },
});

router.post('/companion', aiLimiter, validate(companionValidator), aiController.consultCompanion);

export default router;
