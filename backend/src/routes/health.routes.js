/**
 * STUDIA - Rutas de estado del sistema (/api/health)
 */

import { Router } from 'express';
import { getHealth, getDatabaseHealth } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health -> estado general de la API
router.get('/', getHealth);

// GET /api/health/db -> estado de la conexion a MySQL y tablas creadas
router.get('/db', getDatabaseHealth);

export default router;
