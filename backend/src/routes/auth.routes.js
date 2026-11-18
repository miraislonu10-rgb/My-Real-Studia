/**
 * STUDIA - Rutas iniciales de autenticacion (/api/auth)
 * ------------------------------------------------------------------
 * Modulo aun no implementado: se define el contrato de la API para que el
 * frontend pueda integrarse sin cambios cuando se desarrolle el modulo.
 * Cada endpoint responde 501 (Not Implemented) de forma explicita.
 */

import { Router } from 'express';

const router = Router();

const pending = (endpoint) => (req, res) => {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: `El endpoint ${endpoint} se implementara en el modulo de autenticacion.`,
    data: null,
  });
};

router.post('/register', pending('POST /api/auth/register'));
router.post('/login', pending('POST /api/auth/login'));
router.post('/refresh', pending('POST /api/auth/refresh'));
router.post('/logout', pending('POST /api/auth/logout'));
router.get('/me', pending('GET /api/auth/me'));

export default router;
