/**
 * STUDIA - Servicio del asistente de IA (AI Companion)
 * ------------------------------------------------------------------
 * El frontend NUNCA ve la clave del proveedor: solo llama a este endpoint
 * del backend, que actua como pasarela segura hacia el proveedor de IA.
 * La respuesta incluye `source` y `dataProvenance` para distinguir entre
 * datos reales del estudiante y texto generado por IA.
 */

import api from './api.js';

/**
 * POST /ai/companion
 * Consulta al tutor pedagogico.
 * @param {{action:string, prompt?:string, subjectName?:string, topicName?:string,
 *          exerciseText?:string, userAnswer?:string, correctAnswer?:string}} payload
 */
export const consultAiCompanion = async (payload) => {
  // Se amplia el tiempo de espera: la generacion con el proveedor de IA
  // puede tardar mas que una consulta normal a la API.
  const response = await api.post('/ai/companion', payload, { timeout: 30000 });
  return response.data?.data || null;
};

/**
 * POST /ai/note-to-quiz
 * Convierte apuntes en ejercicios de practica. El backend genera las preguntas
 * (con IA o con el motor local) y las persiste como ejercicios reales.
 * @param {{notes:string, subjectId:number, topicId?:number, subjectName?:string,
 *          topicName?:string, questionCount?:number, difficultyLevel?:string}} payload
 * @returns {{exercises:Array, generation:object}|null}
 */
export const generateQuizFromNotes = async (payload) => {
  const response = await api.post('/ai/note-to-quiz', payload, { timeout: 40000 });
  return response.data?.data || null;
};

export default { consultAiCompanion, generateQuizFromNotes };
