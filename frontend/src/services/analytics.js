/**
 * STUDIA - Servicio de analíticas académicas (cliente)
 * ------------------------------------------------------------------
 * Consume los endpoints REST de /api/analytics a través del servicio
 * centralizado (api.js) y devuelve únicamente datos reales agregados por el
 * backend. Cuando no existen registros, el backend responde con ceros y
 * listas vacías; el cliente nunca genera estadísticas de relleno.
 */

import api from './api.js';

/**
 * GET /analytics/overview
 * Resumen académico con filtros opcionales de fechas.
 * @param {{from?:string, to?:string}} params  from/to en formato YYYY-MM-DD
 */
export const getAnalyticsOverview = (params = {}) =>
  api.get('/analytics/overview', { params }).then((r) => r.data.data);

/**
 * GET /analytics/weekly-report
 * Informe semanal con comparación real frente a la semana anterior.
 * @param {{date?:string}} params  fecha de referencia (YYYY-MM-DD), por defecto hoy
 */
export const getWeeklyReport = (params = {}) =>
  api.get('/analytics/weekly-report', { params }).then((r) => r.data.data.report);

export default { getAnalyticsOverview, getWeeklyReport };
