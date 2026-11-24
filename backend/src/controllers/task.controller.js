/**
 * STUDIA - Controlador de tareas (/api/tasks)
 * ------------------------------------------------------------------
 * REGLAS DE ACCESO
 *   - El ESTUDIANTE administra SUS tareas: las consultas filtran por el
 *     user_id de la sesion y, antes de tocar una fila concreta, se comprueba
 *     la propiedad con assertOwnership.
 *   - El ADMINISTRADOR puede gestionar (soporte) las tareas de cualquier
 *     estudiante indicando ?userUuid= o enviando userUuid en el cuerpo.
 *
 * El dueño NUNCA se toma del cuerpo de la peticion para un estudiante: siempre
 * procede de la sesion verificada.
 *
 * Ademas se valida que la materia (subjectId) y el tema (topicId) indicados
 * existan y pertenezcan al solicitante antes de asociarlos a la tarea.
 */

import * as taskModel from '../models/task.model.js';
import * as subjectModel from '../models/subject.model.js';
import * as topicModel from '../models/topic.model.js';
import * as userModel from '../models/user.model.js';
import { AppError } from '../utils/errors.js';
import { assertOwnership } from '../utils/ownership.js';
import { sendSuccess } from '../utils/respond.js';

/** Resuelve a que usuario pertenecera el recurso creado. */
const resolveOwnerId = async (req, explicitUuid) => {
  if (!explicitUuid) return req.user.id;

  if (req.user.role !== 'admin') {
    throw AppError.forbidden('Solo un administrador puede gestionar el contenido de otro usuario.');
  }

  const owner = await userModel.findByUuid(explicitUuid);
  if (!owner) throw AppError.notFound('No existe un usuario con ese identificador.');
  return owner.id;
};

/** Calcula la paginacion a partir de la consulta. */
const getPagination = (query) => {
  const page = Number.parseInt(query.page ?? '1', 10) || 1;
  const limit = Math.min(Number.parseInt(query.limit ?? '20', 10) || 20, 100);
  return { page, limit, offset: (page - 1) * limit };
};

/**
 * Comprueba que la materia y el tema indicados existan y sean del solicitante.
 * Ambos son opcionales (pueden venir ausentes o en null).
 */
const assertRelatedOwnership = async (requester, data) => {
  if (data.subjectId !== undefined && data.subjectId !== null) {
    const subject = await subjectModel.findById(data.subjectId);
    if (!subject) throw AppError.notFound('No existe la materia indicada.');
    assertOwnership(requester, subject.userId, 'materia');
  }

  if (data.topicId !== undefined && data.topicId !== null) {
    const topic = await topicModel.findById(data.topicId);
    if (!topic) throw AppError.notFound('No existe el tema indicado.');
    assertOwnership(requester, topic.userId, 'tema');
  }
};

/** GET /api/tasks */
export const listTasks = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    // El estudiante solo ve las suyas; el admin filtra por userUuid o ve todas.
    let userId = req.user.id;
    if (req.user.role === 'admin') {
      userId = req.query.userUuid ? await resolveOwnerId(req, req.query.userUuid) : null;
    }

    const { rows, total } = await taskModel.list({
      userId,
      status: req.query.status,
      priority: req.query.priority,
      subjectId: req.query.subjectId,
      from: req.query.from,
      to: req.query.to,
      search: req.query.search,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de tareas.',
      data: {
        tasks: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/tasks/:id */
export const getTask = async (req, res, next) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) throw AppError.notFound('No existe la tarea solicitada.');

    assertOwnership(req.user, task.userId, 'tarea');

    sendSuccess(res, { message: 'Tarea encontrada.', data: { task } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/tasks */
export const createTask = async (req, res, next) => {
  try {
    const { userUuid, ...payload } = req.body;
    const ownerId = await resolveOwnerId(req, userUuid);

    await assertRelatedOwnership(req.user, payload);

    const id = await taskModel.create(ownerId, payload);
    const task = await taskModel.findById(id);

    sendSuccess(res, { status: 201, message: 'Tarea creada correctamente.', data: { task } });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/tasks/:id */
export const updateTask = async (req, res, next) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) throw AppError.notFound('No existe la tarea solicitada.');

    assertOwnership(req.user, task.userId, 'tarea');

    await assertRelatedOwnership(req.user, req.body);

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await taskModel.update(req.params.id, req.body, ownerFilter);
    const updated = await taskModel.findById(req.params.id);

    sendSuccess(res, { message: 'Tarea actualizada correctamente.', data: { task: updated } });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/tasks/:id */
export const deleteTask = async (req, res, next) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) throw AppError.notFound('No existe la tarea solicitada.');

    assertOwnership(req.user, task.userId, 'tarea');

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await taskModel.remove(req.params.id, ownerFilter);

    sendSuccess(res, { message: 'Tarea eliminada correctamente.', data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/tasks/meta/upcoming - proximas tareas pendientes y su contador. */
export const listUpcomingTasks = async (req, res, next) => {
  try {
    const [tasks, pendingCount] = await Promise.all([
      taskModel.listUpcoming(req.user.id, 5),
      taskModel.countPendingByUser(req.user.id),
    ]);

    sendSuccess(res, {
      message: 'Proximas tareas pendientes.',
      data: { tasks, pendingCount },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/tasks/calendar - tareas para el calendario */
export const getCalendar = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      throw AppError.badRequest('Se requieren las fechas from y to para consultar el calendario.');
    }

    const tasks = await taskModel.getCalendar(req.user.id, from, to);
    sendSuccess(res, {
      message: 'Tareas del calendario recuperadas.',
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/tasks/goals - objetivos diarios y semanales */
export const getGoals = async (req, res, next) => {
  try {
    const goals = await taskModel.getGoals(req.user.id);
    sendSuccess(res, {
      message: 'Objetivos diarios y semanales.',
      data: { goals },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/tasks/recommendations/reschedule - recomendaciones para reorganizar tareas no completadas */
export const getRescheduleRecommendations = async (req, res, next) => {
  try {
    const data = await taskModel.getRescheduleRecommendations(req.user.id);
    sendSuccess(res, {
      message: data.message,
      data: { recommendations: data.recommendations },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/tasks/recommendations/apply - aplica una reorganización recomendada */
export const applyReschedule = async (req, res, next) => {
  try {
    const { taskId, suggestedDate, suggestedStartTime, suggestedEndTime, suggestedDueDateTime } = req.body;
    if (!taskId || !suggestedDate) {
      throw AppError.badRequest('taskId y suggestedDate son obligatorios.');
    }

    const task = await taskModel.findById(taskId);
    if (!task) throw AppError.notFound('La tarea indicada no existe.');
    assertOwnership(req.user, task.userId, 'tarea');

    await taskModel.applyReschedule(taskId, req.user.id, {
      suggestedDate,
      suggestedStartTime,
      suggestedEndTime,
      suggestedDueDateTime,
    });

    const updated = await taskModel.findById(taskId);
    sendSuccess(res, {
      message: 'Tarea reorganizada exitosamente sin conflictos de horario.',
      data: { task: updated },
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/tasks/:id/status - cambio rápido de estado */
export const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) throw AppError.notFound('No existe la tarea solicitada.');
    assertOwnership(req.user, task.userId, 'tarea');

    const { status } = req.body;
    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      throw AppError.badRequest('Estado no válido.');
    }

    await taskModel.update(req.params.id, { status }, req.user.id);
    const updated = await taskModel.findById(req.params.id);

    sendSuccess(res, {
      message: `Tarea marcada como ${status}.`,
      data: { task: updated },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  listUpcomingTasks,
  getCalendar,
  getGoals,
  getRescheduleRecommendations,
  applyReschedule,
  updateTaskStatus,
};
