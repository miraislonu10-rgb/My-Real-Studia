/**
 * STUDIA - Servicio del plan de rescate (cliente)
 * ------------------------------------------------------------------
 * `previewRescuePlan` propone un plan antes de un examen sin escribir nada;
 * `applyRescuePlan` crea las tareas reales en Smart Planner.
 */

import api from './api.js';

/**
 * POST /study-rescue/plan
 * Genera una propuesta de plan de rescate comentada por IA.
 * @param {{examDate:string, subjectId?:number, availableMinutesPerDay?:number, maxTopics?:number}} payload
 */
export const previewRescuePlan = async (payload) => {
  const response = await api.post('/study-rescue/plan', payload, { timeout: 45000 });
  return response.data?.data?.plan || null;
};

/**
 * POST /study-rescue/apply
 * Crea las tareas del plan en Smart Planner.
 * @returns {{tasks:Array, plan:object}|null}
 */
export const applyRescuePlan = async (payload) => {
  const response = await api.post('/study-rescue/apply', payload, { timeout: 45000 });
  return response.data?.data || null;
};

export default { previewRescuePlan, applyRescuePlan };
