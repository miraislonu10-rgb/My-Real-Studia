/**
 * STUDIA - Servicio del modulo de docencia
 * ------------------------------------------------------------------
 * Compone las consultas del modelo de docencia con la analitica academica que
 * ya existia, para que el docente vea exactamente los mismos numeros que ve el
 * estudiante en su pantalla de Estadisticas. Nada se recalcula por duplicado
 * ni se estima: son las mismas funciones sobre las mismas tablas.
 */

import * as teacherModel from '../models/teacher.model.js';
import * as analyticsModel from '../models/analytics.model.js';
import { AppError } from '../utils/errors.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Numero maximo de alumnos destacados como "requieren atencion". */
const ATTENTION_LIMIT = 5;

/** Resumen del grupo y alumnos que necesitan acompanamiento. */
export const getCohortSummary = async () => {
  const [summary, needsAttention] = await Promise.all([
    teacherModel.getCohortSummary(),
    teacherModel.getStudentsNeedingAttention(ATTENTION_LIMIT),
  ]);

  return { ...summary, needsAttention };
};

/**
 * Listado paginado de estudiantes con su progreso agregado.
 * @param {{page?:number, limit?:number, search?:string, sort?:string}} filters
 */
export const listStudents = async ({ page, limit, search, sort } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));

  const { rows, total } = await teacherModel.listStudents({
    search: typeof search === 'string' && search.trim() ? search.trim() : undefined,
    sort,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });

  return {
    students: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

/**
 * Detalle de un estudiante: ficha, analitica, materias con sus temas,
 * informe semanal y ultimas sesiones.
 * @param {string} uuid
 */
export const getStudentDetail = async (uuid) => {
  const student = await teacherModel.findStudentByUuid(uuid);
  if (!student) {
    throw AppError.notFound('No se encontro un estudiante con ese identificador.');
  }

  // El id interno no sale de aqui: el cliente solo recibe el uuid publico.
  const { id: userId, ...profile } = student;

  const [subjects, topics, recentSessions, analytics, weeklyReport] = await Promise.all([
    teacherModel.getStudentSubjects(userId),
    teacherModel.getStudentTopics(userId),
    teacherModel.getStudentRecentSessions(userId, 8),
    analyticsModel.getAcademicOverview(userId),
    analyticsModel.getWeeklyReport(userId),
  ]);

  // Los temas se agrupan bajo su materia: es la lectura natural de "que esta
  // viendo" el alumno y evita dos listados separados.
  const subjectsWithTopics = subjects.map((subject) => {
    const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id);
    const averageProgress = subjectTopics.length
      ? Math.round(
          subjectTopics.reduce((total, topic) => total + topic.progressPercent, 0) / subjectTopics.length
        )
      : 0;

    return { ...subject, topics: subjectTopics, averageProgress };
  });

  return {
    student: profile,
    analytics,
    weeklyReport,
    subjects: subjectsWithTopics,
    topicsInProgress: topics.filter((topic) => topic.status === 'in_progress'),
    recentSessions,
  };
};

export default { getCohortSummary, listStudents, getStudentDetail };
