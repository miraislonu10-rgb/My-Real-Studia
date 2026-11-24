/**
 * STUDIA - Rutas de sesiones de estudio (/api/study-sessions)
 * ------------------------------------------------------------------
 * Todas las rutas exigen autenticacion y validan la propiedad de los datos.
 */

import { Router } from 'express';
import * as studySessionController from '../controllers/studySession.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  startSessionValidator,
  finishSessionValidator,
  sessionIdParamValidator,
  listSessionsValidator,
} from '../validators/studySession.validators.js';

const router = Router();

router.use(authenticate);

// Sesion activa en curso
router.get('/active', studySessionController.getActiveSession);

// Metricas y resumen de estudio
router.get('/stats', studySessionController.getStats);

// Historial de sesiones
router.get('/', validate(listSessionsValidator), studySessionController.listSessions);

// Iniciar nueva sesion
router.post('/start', validate(startSessionValidator), studySessionController.startSession);

// Pausar sesion activa
router.post('/:id/pause', validate(sessionIdParamValidator), studySessionController.pauseSession);

// Reanudar sesion pausada
router.post('/:id/resume', validate(sessionIdParamValidator), studySessionController.resumeSession);

// Finalizar sesion y registrar productividad
router.post('/:id/finish', validate(finishSessionValidator), studySessionController.finishSession);

// Descartar sesion en curso
router.delete('/:id', validate(sessionIdParamValidator), studySessionController.discardSession);

export default router;
