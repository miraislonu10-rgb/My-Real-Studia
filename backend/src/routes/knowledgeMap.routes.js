/**
 * STUDIA - Rutas del mapa de conocimiento (/api/knowledge-map)
 * ------------------------------------------------------------------
 * Requieren autenticacion. El mapa se calcula a partir de los datos reales
 * del estudiante autenticado.
 */

import { Router } from 'express';
import * as knowledgeMapController from '../controllers/knowledgeMap.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', knowledgeMapController.getKnowledgeMap);

export default router;
