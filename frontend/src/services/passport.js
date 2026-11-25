/**
 * STUDIA - Servicio del pasaporte academico (cliente)
 * ------------------------------------------------------------------
 * Gestiona las entradas manuales (habilidades, proyectos, certificaciones y
 * logros). El progreso automatico y los distintivos los calcula el backend.
 */

import api from './api.js';

/** GET /passport - Pasaporte completo (entradas + progreso + distintivos). */
export const getPassport = async () => {
  const response = await api.get('/passport');
  return response.data?.data?.passport || null;
};

/** POST /passport/entries - Añade una entrada manual. */
export const createPassportEntry = async (payload) => {
  const response = await api.post('/passport/entries', payload);
  return response.data?.data?.entry || null;
};

/** PUT /passport/entries/:id - Actualiza una entrada. */
export const updatePassportEntry = async (id, payload) => {
  const response = await api.put(`/passport/entries/${id}`, payload);
  return response.data?.data?.entry || null;
};

/** DELETE /passport/entries/:id - Elimina una entrada. */
export const deletePassportEntry = async (id) => {
  const response = await api.delete(`/passport/entries/${id}`);
  return response.data?.data || null;
};

export default { getPassport, createPassportEntry, updatePassportEntry, deletePassportEntry };
