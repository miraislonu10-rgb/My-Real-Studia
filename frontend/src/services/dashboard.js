/**
 * STUDIA - Servicio del panel (cliente)
 * ------------------------------------------------------------------
 * El backend devuelve agregados reales: cuando no hay registros los totales son
 * 0 y las listas van vacias. El cliente nunca recibe datos de relleno.
 */

import api from './api.js';

/** GET /dashboard/student - resumen del estudiante autenticado. */
export const getStudentDashboard = (params = {}) =>
  api.get('/dashboard/student', { params }).then((r) => r.data.data);

/** GET /dashboard/admin - resumen global (solo administrador). */
export const getAdminDashboard = () => api.get('/dashboard/admin').then((r) => r.data.data);

export default { getStudentDashboard, getAdminDashboard };
