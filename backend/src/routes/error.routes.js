/**
 * STUDIA - Rutas del diario de errores (/api/errors)
 * ------------------------------------------------------------------
 * Todas las rutas requieren autenticacion previa y comprueban propiedad.
 */

import { Router } from 'express';
import * as errorController from '../controllers/error.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createErrorValidator,
  updateErrorValidator,
  updateStatusValidator,
  errorIdParamValidator,
  listErrorsValidator,
} from '../validators/error.validators.js';

const router = Router();

router.use(authenticate);

// Metricas del diario de errores
router.get('/stats', errorController.getErrorStats);

// Listar errores con filtros y busqueda
router.get('/', validate(listErrorsValidator), errorController.listErrors);

// Registrar nuevo error
router.post('/', validate(createErrorValidator), errorController.createError);

// Obtener detalle de un error
router.get('/:id', validate(errorIdParamValidator), errorController.getError);

// Editar error completo
router.put('/:id', validate(updateErrorValidator), errorController.updateError);

// Cambiar estado de revision rapidamente (pendiente, en revision, comprendido)
router.patch('/:id/status', validate(updateStatusValidator), errorController.updateStatus);

// Eliminar error
router.delete('/:id', validate(errorIdParamValidator), errorController.deleteError);

export default router;
