/**
 * STUDIA - Servicio de sesiones de estudio (Smart Focus)
 * ------------------------------------------------------------------
 * Conecta con los endpoints del cronometro inteligente en el backend.
 */

import api from './api.js';

/** GET /study-sessions/active - Consulta si hay sesion activa en el servidor */
export const getActiveSession = async () => {
  const response = await api.get('/study-sessions/active');
  return response.data?.data?.activeSession || null;
};

/** POST /study-sessions/start - Inicia una nueva sesion */
export const startSession = async (payload) => {
  const response = await api.post('/study-sessions/start', payload);
  return response.data?.data?.session;
};

/** POST /study-sessions/:id/pause - Pausa la sesion activa */
export const pauseSession = async (id) => {
  const response = await api.post(`/study-sessions/${id}/pause`);
  return response.data?.data?.session;
};

/** POST /study-sessions/:id/resume - Reanuda la sesion pausada */
export const resumeSession = async (id) => {
  const response = await api.post(`/study-sessions/${id}/resume`);
  return response.data?.data?.session;
};

/** POST /study-sessions/:id/finish - Finaliza y registra productividad */
export const finishSession = async (id, payload) => {
  const response = await api.post(`/study-sessions/${id}/finish`, payload);
  return response.data?.data?.session;
};

/** DELETE /study-sessions/:id - Descarta la sesion en curso */
export const discardSession = async (id) => {
  const response = await api.delete(`/study-sessions/${id}`);
  return response.data?.data?.discarded;
};

/** GET /study-sessions - Historial de sesiones finalizadas */
export const listSessions = async (params = {}) => {
  const response = await api.get('/study-sessions', { params });
  return response.data?.data || { sessions: [], pagination: {} };
};

/** GET /study-sessions/stats - Metricas agregadas de estudio */
export const getSessionStats = async () => {
  const response = await api.get('/study-sessions/stats');
  return response.data?.data?.stats;
};
