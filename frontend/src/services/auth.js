/**
 * STUDIA - Servicio de autenticacion (cliente)
 * ------------------------------------------------------------------
 * Envuelve los endpoints del backend. El AuthContext es quien mantiene el
 * estado; este modulo solo sabe hablar con la API.
 */

import api from './api.js';

/** POST /auth/register */
export const register = (payload) => api.post('/auth/register', payload).then((r) => r.data.data);

/** POST /auth/login */
export const login = (payload) => api.post('/auth/login', payload).then((r) => r.data.data);

/** POST /auth/logout - el servidor elimina la cookie de refresco */
export const logout = () => api.post('/auth/logout').then((r) => r.data);

/** POST /auth/logout-all - cierra todas las sesiones abiertas */
export const logoutAll = () => api.post('/auth/logout-all').then((r) => r.data.data);

/** GET /auth/me */
export const fetchMe = () => api.get('/auth/me').then((r) => r.data.data.user);

/** POST /auth/forgot-password */
export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email }).then((r) => r.data);

/** POST /auth/reset-password */
export const resetPassword = (payload) => api.post('/auth/reset-password', payload).then((r) => r.data);

/** GET /setup/status - indica si hace falta crear el primer administrador. */
export const getSetupStatus = () => api.get('/setup/status').then((r) => r.data.data);

/** POST /setup/first-admin - crea el primer administrador (solo si no existe ninguno). */
export const createFirstAdmin = (payload) =>
  api.post('/setup/first-admin', payload).then((r) => r.data.data);

/** GET /users/me/profile */
export const getMyProfile = () => api.get('/users/me/profile').then((r) => r.data.data.profile);

/** PUT /users/me/profile */
export const updateMyProfile = (payload) =>
  api.put('/users/me/profile', payload).then((r) => r.data.data.profile);

/** PUT /users/me - actualiza los datos base de la propia cuenta (nombre, correo). */
export const updateMyAccount = (payload) => api.put('/users/me', payload).then((r) => r.data.data.user);

/** DELETE /users/me - baja logica de la propia cuenta. */
export const deleteMyAccount = () => api.delete('/users/me').then((r) => r.data.data);

/** GET /users/:uuid/profile - autorizado solo para el propio usuario o un admin */
export const getProfileByUuid = (uuid) =>
  api.get(`/users/${uuid}/profile`).then((r) => r.data.data.profile);

/** GET /users - solo administradores */
export const listUsers = (params = {}) => api.get('/users', { params }).then((r) => r.data.data);

/** GET /users/:uuid - solo administradores */
export const getUserByUuid = (uuid) => api.get(`/users/${uuid}`).then((r) => r.data.data);

/** POST /users - alta de usuario desde el panel (solo administradores). */
export const createUser = (payload) => api.post('/users', payload).then((r) => r.data.data);

/** PUT /users/:uuid - edicion de los datos base de la cuenta (solo admin). */
export const updateUser = (uuid, payload) => api.put(`/users/${uuid}`, payload).then((r) => r.data.data);

/** DELETE /users/:uuid - baja logica de la cuenta (solo admin). */
export const deleteUser = (uuid) => api.delete(`/users/${uuid}`).then((r) => r.data.data);

/** PATCH /users/:uuid/status - solo administradores */
export const updateUserStatus = (uuid, status) =>
  api.patch(`/users/${uuid}/status`, { status }).then((r) => r.data.data);

export default {
  register,
  login,
  logout,
  logoutAll,
  fetchMe,
  forgotPassword,
  resetPassword,
  getSetupStatus,
  createFirstAdmin,
  getMyProfile,
  updateMyProfile,
  updateMyAccount,
  deleteMyAccount,
  getProfileByUuid,
  listUsers,
  getUserByUuid,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
};
