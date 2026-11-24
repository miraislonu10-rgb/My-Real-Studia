/**
 * STUDIA - Servicios de las entidades academicas (cliente)
 * ------------------------------------------------------------------
 * Cada servicio envuelve los endpoints REST del backend y devuelve la carga
 * util (`data`) de la respuesta uniforme { success, message, data }.
 *
 * El dueño de cada registro NO se envia desde aqui para un estudiante: el
 * backend lo toma siempre de la sesion verificada. Solo el administrador puede
 * indicar `userUuid` para operar (soporte) sobre el contenido de un estudiante.
 */

import api from './api.js';

/** Crea un servicio CRUD estandar para una coleccion de la API. */
const createCrudService = (path) => ({
  list: (params = {}) => api.get(path, { params }).then((r) => r.data.data),
  get: (id) => api.get(`${path}/${id}`).then((r) => r.data.data),
  create: (payload) => api.post(path, payload).then((r) => r.data.data),
  update: (id, payload) => api.put(`${path}/${id}`, payload).then((r) => r.data.data),
  remove: (id) => api.delete(`${path}/${id}`).then((r) => r.data.data),
});

/* ---------------------------------------------------------------- Materias */
export const subjects = {
  ...createCrudService('/subjects'),
  /** Lista simple para selectores (id, name, color, status). */
  options: (params = {}) => api.get('/subjects/options', { params }).then((r) => r.data.data.subjects),
};

/* ------------------------------------------------------------------ Temas */
export const topics = createCrudService('/topics');

/* ----------------------------------------------------------------- Tareas */
export const tasks = {
  ...createCrudService('/tasks'),
  /** Tareas proximas sin finalizar (usadas en el panel). */
  upcoming: (params = {}) => api.get('/tasks/meta/upcoming', { params }).then((r) => r.data.data),
};

/* ------------------------------------------------------------- Ejercicios */
export const exercises = createCrudService('/exercises');

/* ---------------------------------------------------------------- Recursos */
export const resources = createCrudService('/resources');

export default { subjects, topics, tasks, exercises, resources };
