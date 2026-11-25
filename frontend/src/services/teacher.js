/**
 * STUDIA - Servicio de docencia (cliente)
 * ------------------------------------------------------------------
 * Consume los endpoints de SOLO LECTURA de /api/teacher para que el docente
 * (administrador o tutor) acompañe a los alumnos: resumen del grupo, listado
 * con su progreso y ficha detallada. Este servicio no realiza ninguna
 * operacion de escritura.
 */

import api from './api.js';

/**
 * GET /teacher/summary
 * Resumen del grupo: alumnos, actividad acumulada, materias destacadas,
 * temas en curso y alumnos que requieren atencion.
 */
export const getTeacherSummary = () => api.get('/teacher/summary').then((r) => r.data.data);

/**
 * GET /teacher/students
 * Listado paginado de alumnos con su progreso agregado.
 * @param {{page?:number, limit?:number, search?:string, sort?:string}} params
 */
export const listStudents = (params = {}) =>
  api.get('/teacher/students', { params }).then((r) => r.data.data);

/**
 * GET /teacher/students/:uuid
 * Progreso detallado de un alumno (analitica, materias con sus temas y
 * ultimas sesiones).
 */
export const getStudentProgress = (uuid) =>
  api.get(`/teacher/students/${uuid}`).then((r) => r.data.data);

export default { getTeacherSummary, listStudents, getStudentProgress };
