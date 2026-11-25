/**
 * STUDIA - Servicio del mapa de conocimiento (cliente)
 * ------------------------------------------------------------------
 * Consume el mapa de dominio por tema calculado por el backend combinando
 * progreso declarado, intentos de ejercicios, errores y tarjetas de memoria.
 */

import api from './api.js';

/**
 * GET /knowledge-map
 * Mapa de dominio por tema del estudiante autenticado.
 */
export const getKnowledgeMap = async () => {
  const response = await api.get('/knowledge-map');
  return response.data?.data?.map || null;
};

export default { getKnowledgeMap };
