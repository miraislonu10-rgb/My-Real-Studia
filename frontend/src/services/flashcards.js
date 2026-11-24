/**
 * STUDIA - Servicio de tarjetas de memoria (Memory Lab)
 * ------------------------------------------------------------------
 * Envuelve los endpoints REST de /api/flashcards: CRUD, tarjetas pendientes,
 * historial de repasos y estadisticas. Todo el estado (intervalos, fechas de
 * revision y factor de facilidad SM-2) se calcula y persiste en MySQL.
 */

import api from './api.js';

/** GET /flashcards - Listado paginado con filtros */
export const listFlashcards = async (params = {}) => {
  const response = await api.get('/flashcards', { params });
  return response.data?.data || { flashcards: [], pagination: null };
};

/** GET /flashcards/pending - Tarjetas pendientes de repaso hoy */
export const getPendingFlashcards = async () => {
  const response = await api.get('/flashcards/pending');
  return response.data?.data?.flashcards || [];
};

/** GET /flashcards/history - Historial de repasos */
export const getReviewHistory = async () => {
  const response = await api.get('/flashcards/history');
  return response.data?.data?.history || [];
};

/** GET /flashcards/stats - Metricas de Memory Lab */
export const getFlashcardStats = async () => {
  const response = await api.get('/flashcards/stats');
  return response.data?.data?.stats || null;
};

/** GET /flashcards/:id */
export const getFlashcard = async (id) => {
  const response = await api.get(`/flashcards/${id}`);
  return response.data?.data?.flashcard || null;
};

/** POST /flashcards */
export const createFlashcard = async (payload) => {
  const response = await api.post('/flashcards', payload);
  return response.data?.data?.flashcard || null;
};

/** PUT /flashcards/:id */
export const updateFlashcard = async (id, payload) => {
  const response = await api.put(`/flashcards/${id}`, payload);
  return response.data?.data?.flashcard || null;
};

/** POST /flashcards/:id/review - Registra la respuesta y reprograma el repaso (SM-2) */
export const reviewFlashcard = async (id, payload) => {
  const response = await api.post(`/flashcards/${id}/review`, payload);
  return response.data?.data?.flashcard || null;
};

/** DELETE /flashcards/:id */
export const deleteFlashcard = async (id) => {
  const response = await api.delete(`/flashcards/${id}`);
  return response.data?.data || null;
};

export default {
  listFlashcards,
  getPendingFlashcards,
  getReviewHistory,
  getFlashcardStats,
  getFlashcard,
  createFlashcard,
  updateFlashcard,
  reviewFlashcard,
  deleteFlashcard,
};
