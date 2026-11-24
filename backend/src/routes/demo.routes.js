/**
 * STUDIA - Rutas de datos de ejemplo (/api/demo)
 * ------------------------------------------------------------------
 * Requiere sesion activa de ESTUDIANTE: el contenido generado pertenece a
 * quien lo solicita y se asocia siempre a su `user_id`.
 */

import { Router } from 'express';

import * as demoController from '../controllers/demo.controller.js';
import { authenticate, requireStudent } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Carga contenido de ejemplo (solo si la cuenta no tiene materias todavia).
router.post('/seed', requireStudent, demoController.seedDemoData);

export default router;
