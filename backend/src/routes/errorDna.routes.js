/**
 * STUDIA - Rutas del Error DNA (/api/error-dna)
 * ------------------------------------------------------------------
 * Requieren autenticacion. Analisis de solo lectura sobre el diario de errores.
 */

import { Router } from 'express';
import * as errorDnaController from '../controllers/errorDna.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { errorDnaQueryValidator } from '../validators/errorDna.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(errorDnaQueryValidator), errorDnaController.getErrorDna);

export default router;
