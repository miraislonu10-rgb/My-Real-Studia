/**
 * STUDIA - Rutas del panel (/api/dashboard)
 * ------------------------------------------------------------------
 *   - GET /api/dashboard/student -> resumen del propio estudiante.
 *   - GET /api/dashboard/admin   -> resumen global (solo administrador).
 *
 * El estudiante NUNCA recibe datos de otro: el controlador usa siempre
 * req.user.id y no acepta ningun identificador de usuario en la peticion.
 */

import { Router } from 'express';

import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/student', dashboardController.getStudentDashboard);
router.get('/admin', requireAdmin, dashboardController.getAdminDashboard);

export default router;
