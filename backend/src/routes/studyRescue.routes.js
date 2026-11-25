/**
 * STUDIA - Rutas del plan de rescate (/api/study-rescue)
 * ------------------------------------------------------------------
 * Requieren autenticacion. `/plan` propone y `/apply` persiste las tareas.
 */

import { Router } from 'express';
import * as studyRescueController from '../controllers/studyRescue.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { rescuePlanValidator } from '../validators/studyRescue.validators.js';

const router = Router();

router.use(authenticate);

router.post('/plan', validate(rescuePlanValidator), studyRescueController.previewRescue);
router.post('/apply', validate(rescuePlanValidator), studyRescueController.applyRescue);

export default router;
