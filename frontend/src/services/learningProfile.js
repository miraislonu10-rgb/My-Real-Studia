/**
 * STUDIA - Servicio del perfil de aprendizaje (Learning Profile)
 * ------------------------------------------------------------------
 * Cuestionario multidimensional y generador dinámico de preferencias.
 */

import api from './api.js';

/** GET /learning-profile - Consulta el perfil y preferencias */
export const getLearningProfile = async () => {
  const response = await api.get('/learning-profile');
  return response.data?.data?.profile || null;
};

/** PUT /learning-profile - Guarda respuestas del cuestionario y recalcula perfil dinámico */
export const updateLearningProfile = async (payload) => {
  const response = await api.put('/learning-profile', payload);
  return response.data?.data?.profile || null;
};
