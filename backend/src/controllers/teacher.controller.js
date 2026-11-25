/**
 * STUDIA - Controlador del modulo de docencia
 * ------------------------------------------------------------------
 * Entrega informacion de acompanamiento a administradores y tutores.
 * Todas las rutas son de LECTURA: este controlador no modifica datos.
 */

import * as teacherService from '../services/teacher.service.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/teacher/summary
 * Resumen del grupo: alumnos, actividad acumulada, materias destacadas,
 * temas en curso y alumnos que requieren atencion.
 */
export const getSummary = async (req, res, next) => {
  try {
    const data = await teacherService.getCohortSummary();
    sendSuccess(res, { message: 'Resumen del grupo recuperado.', data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/students
 * Listado paginado de estudiantes con su progreso.
 */
export const listStudents = async (req, res, next) => {
  try {
    const { page, limit, search, sort } = req.query;
    const data = await teacherService.listStudents({ page, limit, search, sort });
    sendSuccess(res, { message: 'Listado de estudiantes.', data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/students/:uuid
 * Progreso detallado de un estudiante.
 */
export const getStudentDetail = async (req, res, next) => {
  try {
    const data = await teacherService.getStudentDetail(req.params.uuid);
    sendSuccess(res, { message: 'Detalle de progreso del estudiante.', data });
  } catch (error) {
    next(error);
  }
};

export default { getSummary, listStudents, getStudentDetail };
