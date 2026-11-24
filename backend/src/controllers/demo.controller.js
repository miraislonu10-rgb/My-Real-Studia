/**
 * STUDIA - Controlador de datos de ejemplo (/api/demo)
 * ------------------------------------------------------------------
 * Capa HTTP del generador de contenido de demostracion. El `user_id` procede
 * siempre de la sesion verificada (anti-IDOR).
 */

import * as demoService from '../services/demo.service.js';
import { sendSuccess } from '../utils/respond.js';

/** POST /api/demo/seed - carga contenido de ejemplo en la cuenta del estudiante. */
export const seedDemoData = async (req, res, next) => {
  try {
    const result = await demoService.seedForUser(req.user.id);
    sendSuccess(res, {
      status: 201,
      message: result.message,
      data: { created: result.created },
    });
  } catch (error) {
    next(error);
  }
};

export default { seedDemoData };
