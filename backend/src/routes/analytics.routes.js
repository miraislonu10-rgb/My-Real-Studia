/**
 * STUDIA - Rutas de analíticas académicas (/api/analytics)
 * ------------------------------------------------------------------
 * Requieren autenticación y operan exclusivamente sobre el usuario autenticado.
 */

import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/overview', analyticsController.getOverview);
router.get('/weekly-report', analyticsController.getWeeklyReport);

export default router;
