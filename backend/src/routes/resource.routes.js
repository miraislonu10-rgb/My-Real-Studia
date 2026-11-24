/**
 * STUDIA - Rutas de recursos educativos (/api/resources)
 * ------------------------------------------------------------------
 * Todo el modulo exige autenticacion. La lectura ('GET /' y 'GET /:id') esta
 * disponible para cualquier usuario autenticado; la gestion ('POST', 'PUT' y
 * 'DELETE') queda restringida al ADMINISTRADOR mediante requireAdmin.
 *
 * La visibilidad de los recursos ocultos para estudiantes se aplica dentro del
 * controlador, de modo que un estudiante nunca ve material sin publicar.
 */

import { Router } from 'express';

import * as resourceController from '../controllers/resource.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import {
  createResourceValidator,
  updateResourceValidator,
  resourceIdParamValidator,
  listResourcesValidator,
} from '../validators/resource.validators.js';

const router = Router();

router.use(authenticate);

// Lectura: cualquier usuario autenticado.
router.get('/', validate(listResourcesValidator), resourceController.listResources);
router.get('/:id', validate(resourceIdParamValidator), resourceController.getResource);

// Gestion exclusiva del administrador.
router.post('/', requireAdmin, validate(createResourceValidator), resourceController.createResource);
router.put(
  '/:id',
  requireAdmin,
  validate([...resourceIdParamValidator, ...updateResourceValidator]),
  resourceController.updateResource
);
router.delete('/:id', requireAdmin, validate(resourceIdParamValidator), resourceController.deleteResource);

export default router;
