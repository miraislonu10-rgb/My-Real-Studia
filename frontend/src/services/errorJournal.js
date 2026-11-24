/**
 * STUDIA - Servicio del diario de errores (Error Journal)
 * ------------------------------------------------------------------
 * Conecta con los endpoints de errores en el backend.
 */

import api from './api.js';

/** GET /errors - Lista errores con filtros y busqueda */
export const listErrors = async (params = {}) => {
  const response = await api.get('/errors', { params });
  return response.data?.data || { errors: [], pagination: {} };
};

/** GET /errors/stats - Metricas y conteos por tipo y estado */
export const getErrorStats = async () => {
  const response = await api.get('/errors/stats');
  return response.data?.data?.stats;
};

/** GET /errors/:id - Detalle de un error */
export const getError = async (id) => {
  const response = await api.get(`/errors/${id}`);
  return response.data?.data?.error;
};

/** POST /errors - Registra un nuevo error */
export const createError = async (payload) => {
  const response = await api.post('/errors', payload);
  return response.data?.data?.error;
};

/** PUT /errors/:id - Actualiza un error */
export const updateError = async (id, payload) => {
  const response = await api.put(`/errors/${id}`, payload);
  return response.data?.data?.error;
};

/** PATCH /errors/:id/status - Cambia rapidamente el estado de revision */
export const updateErrorStatus = async (id, status) => {
  const response = await api.patch(`/errors/${id}/status`, { status });
  return response.data?.data?.error;
};

/** DELETE /errors/:id - Elimina un error */
export const deleteError = async (id) => {
  const response = await api.delete(`/errors/${id}`);
  return response.data?.data?.deleted;
};
