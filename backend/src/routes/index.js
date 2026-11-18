/**
 * STUDIA - Enrutador principal de la API (/api)
 * ------------------------------------------------------------------
 * Agrupa los modulos de rutas. Por ahora solo se exponen las rutas
 * iniciales (indice de la API y comprobacion de estado). Los modulos
 * funcionales (auth, materias, sesiones, etc.) se añadiran mas adelante.
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Indice de la API: describe los recursos disponibles
router.get('/', (req, res) => {
  res.json({
    success: true,
    error: null,
    message: 'STUDIA API v0.1.0',
    data: {
      service: 'studia-api',
      version: '0.1.0',
      status: 'online',
      endpoints: {
        health: '/api/health',
        database: '/api/health/db',
        auth: '/api/auth',
      },
    },
  });
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export default router;
