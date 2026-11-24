/**
 * STUDIA - Rutas de usuarios y perfil (/api/users)
 * ------------------------------------------------------------------
 * Rutas "self" (/me): no aceptan identificadores, siempre operan sobre el
 * usuario autenticado. Son la forma recomendada de exponer datos propios.
 *
 * Rutas con identificador (/:uuid): incluyen validacion del UUID y, ademas,
 * control de propiedad en el controlador (anti-IDOR). Las de listado y
 * gestion quedan restringidas al rol administrador.
 */

import { Router } from 'express';

import * as userController from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import {
  updateProfileValidator,
  uuidParamValidator,
  updateStatusValidator,
  listUsersValidator,
  createUserValidator,
  updateUserValidator,
  updateMyAccountValidator,
} from '../validators/user.validators.js';

const router = Router();

// Todas las rutas de este modulo exigen autenticacion
router.use(authenticate);

// --- Datos propios (sin identificador en la URL) --------------------------
router.get('/me', userController.getMyAccount);
router.get('/me/profile', userController.getMyProfile);
router.put('/me/profile', validate(updateProfileValidator), userController.updateMyProfile);
router.put('/me', validate(updateMyAccountValidator), userController.updateMyAccount);
router.delete('/me', userController.deleteMyAccount);

// --- Rutas con identificador: control de propiedad en el controlador ------
router.get('/:uuid/profile', validate(uuidParamValidator), userController.getProfileByUuid);

// --- Administracion (solo rol admin) -------------------------------------
router.get('/', requireAdmin, validate(listUsersValidator), userController.listUsers);
router.post('/', requireAdmin, validate(createUserValidator), userController.createUser);
router.get('/:uuid', requireAdmin, validate(uuidParamValidator), userController.getUserByUuid);
router.put('/:uuid', requireAdmin, validate(updateUserValidator), userController.updateUser);
router.delete('/:uuid', requireAdmin, validate(uuidParamValidator), userController.deleteUser);
router.patch('/:uuid/status', requireAdmin, validate(updateStatusValidator), userController.updateUserStatus);

export default router;
