/**
 * STUDIA - Rutas del perfil de aprendizaje (/api/learning-profile)
 * ------------------------------------------------------------------
 * Requieren autenticación y operan sobre el usuario de la sesión.
 */

import { Router } from 'express';
import * as learningProfileController from '../controllers/learningProfile.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { savePreferencesValidator } from '../validators/learningProfile.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', learningProfileController.getProfile);
router.put('/', validate(savePreferencesValidator), learningProfileController.updateProfile);

export default router;
