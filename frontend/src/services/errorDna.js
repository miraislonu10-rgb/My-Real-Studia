/**
 * STUDIA - Servicio del Error DNA (cliente)
 * ------------------------------------------------------------------
 * Expone el analisis de patrones de errores calculado por el backend a partir
 * del diario de errores real. Sin datos, el backend responde con estructuras
 * vacias y la UI lo indica; nunca se generan cifras de relleno.
 */

import api from './api.js';

/**
 * GET /error-dna
 * Analisis de patrones de errores con filtros opcionales de fecha.
 * @param {{from?:string, to?:string}} params  fechas YYYY-MM-DD
 */
export const getErrorDnaAnalysis = async (params = {}) => {
  const response = await api.get('/error-dna', { params });
  return response.data?.data?.analysis || null;
};

export default { getErrorDnaAnalysis };
