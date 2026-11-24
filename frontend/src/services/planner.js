/**
 * STUDIA - Servicio del organizador académico (Smart Planner)
 * ------------------------------------------------------------------
 * Conecta con los endpoints de tareas, objetivos, calendario y recomendaciones.
 */

import api from './api.js';

/** GET /tasks - Lista tareas con filtros */
export const listTasks = async (params = {}) => {
  const response = await api.get('/tasks', { params });
  return response.data?.data || { tasks: [], pagination: {} };
};

/** POST /tasks - Crea una tarea u objetivo */
export const createTask = async (payload) => {
  const response = await api.post('/tasks', payload);
  return response.data?.data?.task;
};

/** GET /tasks/:id - Obtiene una tarea */
export const getTask = async (id) => {
  const response = await api.get(`/tasks/${id}`);
  return response.data?.data?.task;
};

/** PUT /tasks/:id - Actualiza una tarea */
export const updateTask = async (id, payload) => {
  const response = await api.put(`/tasks/${id}`, payload);
  return response.data?.data?.task;
};

/** PATCH /tasks/:id/status - Cambia el estado (pending, completed, etc.) */
export const updateTaskStatus = async (id, status) => {
  const response = await api.patch(`/tasks/${id}/status`, { status });
  return response.data?.data?.task;
};

/** DELETE /tasks/:id - Elimina una tarea */
export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data?.data;
};

/** GET /tasks/calendar - Obtiene eventos para el calendario */
export const getCalendarTasks = async (from, to) => {
  const response = await api.get('/tasks/calendar', { params: { from, to } });
  return response.data?.data?.tasks || [];
};

/** GET /tasks/goals - Obtiene objetivos diarios y semanales */
export const getGoals = async () => {
  const response = await api.get('/tasks/goals');
  return response.data?.data?.goals || { daily: [], weekly: [], dailyCompleted: 0, dailyTotal: 0, weeklyCompleted: 0, weeklyTotal: 0 };
};

/** GET /tasks/recommendations/reschedule - Recomendaciones para reorganizar tareas no completadas */
export const getRescheduleRecommendations = async () => {
  const response = await api.get('/tasks/recommendations/reschedule');
  return response.data?.data?.recommendations || [];
};

/** POST /tasks/recommendations/apply - Aplica reorganización recomendada libre de solapamientos */
export const applyRescheduleRecommendation = async (payload) => {
  const response = await api.post('/tasks/recommendations/apply', payload);
  return response.data?.data?.task;
};
