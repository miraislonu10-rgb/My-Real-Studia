/**
 * STUDIA - Controlador de la configuracion inicial (/api/setup)
 * ------------------------------------------------------------------
 * Capa HTTP: traduce las peticiones a llamadas del servicio y respuestas
 * uniformes. No contiene logica de negocio (vive en services/setup.service.js).
 */

import * as setupService from '../services/setup.service.js';
import { sendSuccess } from '../utils/respond.js';

/** GET /api/setup/status - indica si hace falta crear el primer administrador. */
export const getStatus = async (req, res, next) => {
  try {
    const status = await setupService.getSetupStatus();
    sendSuccess(res, { message: 'Estado de la configuracion inicial.', data: status });
  } catch (error) {
    next(error);
  }
};

/** POST /api/setup/first-admin - crea el primer administrador (solo si no existe ninguno). */
export const createFirstAdmin = async (req, res, next) => {
  try {
    const user = await setupService.createFirstAdmin(req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Cuenta de administrador creada correctamente. Ya puedes iniciar sesion.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export default { getStatus, createFirstAdmin };
