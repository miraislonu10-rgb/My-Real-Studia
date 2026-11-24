/**
 * STUDIA - Servicio de materias y temas (cliente)
 * ------------------------------------------------------------------
 * Proporciona el catalogo de materias y temas del estudiante autenticado.
 */

import api from './api.js';

/** GET /subjects - Lista materias del usuario */
export const getSubjects = async (params = {}) => {
  const response = await api.get('/subjects', { params: { limit: 100, ...params } });
  return response.data?.data?.subjects || [];
};

/** GET /topics - Lista temas filtrando opcionalmente por materia */
export const getTopics = async (subjectId = null) => {
  const params = { limit: 100 };
  if (subjectId) params.subjectId = subjectId;
  const response = await api.get('/topics', { params });
  return response.data?.data?.topics || [];
};
