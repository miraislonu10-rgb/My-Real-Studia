/**
 * STUDIA - Controlador del mapa de conocimiento (Knowledge Map)
 * ------------------------------------------------------------------
 * Devuelve el dominio por tema y sus relaciones, calculado a partir de los
 * datos reales del estudiante (progreso, intentos, errores y tarjetas).
 */

import * as knowledgeMapModel from '../models/knowledgeMap.model.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/knowledge-map
 * Mapa de dominio por tema del estudiante autenticado.
 */
export const getKnowledgeMap = async (req, res, next) => {
  try {
    const map = await knowledgeMapModel.getMap(req.user.id);

    sendSuccess(res, {
      message: map.hasData
        ? 'Mapa de conocimiento generado a partir de tus datos.'
        : 'Aun no tienes temas con los que construir el mapa.',
      data: { map },
    });
  } catch (error) {
    next(error);
  }
};
