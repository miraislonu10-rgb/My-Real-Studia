/**
 * STUDIA - Controlador de ejercicios de practica (/api/exercises)
 * ------------------------------------------------------------------
 * REGLAS DE ACCESO
 *   - El ESTUDIANTE administra SUS ejercicios: las consultas filtran por el
 *     user_id de la sesion y, antes de tocar una fila concreta, se comprueba
 *     la propiedad con assertOwnership.
 *   - El ADMINISTRADOR puede gestionar (soporte) los ejercicios de cualquier
 *     estudiante indicando ?userUuid= o enviando userUuid en el cuerpo.
 *
 * El dueño NUNCA se toma del cuerpo de la peticion para un estudiante: siempre
 * procede de la sesion verificada (o del dueño de la materia indicada).
 */

import * as exerciseModel from '../models/exercise.model.js';
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

/** GET /api/exercises */
export const listExercises = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    // El estudiante solo ve los suyos; el admin filtra por userUuid o ve todos.
    let userId = req.user.id;
    if (req.user.role === 'admin') {
      userId = req.query.userUuid ? await resolveOwnerId(req, req.query.userUuid) : null;
    }

    const { rows, total } = await exerciseModel.list({
      userId,
      subjectId: req.query.subjectId,
      topicId: req.query.topicId,
      exerciseType: req.query.exerciseType,
      difficultyLevel: req.query.difficultyLevel,
      isActive: req.query.isActive,
      search: req.query.search,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de ejercicios.',
      data: {
        exercises: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/exercises/:id */
export const getExercise = async (req, res, next) => {
  try {
    const exercise = await exerciseModel.findById(req.params.id);
    if (!exercise) throw AppError.notFound('No existe el ejercicio solicitado.');

    assertOwnership(req.user, exercise.userId, 'ejercicio');

    sendSuccess(res, { message: 'Ejercicio encontrado.', data: { exercise } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/exercises */
export const createExercise = async (req, res, next) => {
  try {
    const { userUuid, ...payload } = req.body;

    // La materia es obligatoria y debe existir.
    const subject = await subjectModel.findById(payload.subjectId);
    if (!subject) throw AppError.notFound('No existe la materia indicada.');

    // Comprueba la propiedad de la materia (anti-IDOR). El admin puede operar
    // sobre la materia de cualquier estudiante.
    assertOwnership(req.user, subject.userId, 'materia');

    // Si un administrador indica un userUuid, la materia debe ser de ese usuario.
    if (userUuid) {
      const resolvedOwnerId = await resolveOwnerId(req, userUuid);
      if (Number(resolvedOwnerId) !== Number(subject.userId)) {
        throw AppError.forbidden('La materia indicada no pertenece a ese usuario.');
      }
    }

    // El tema es opcional; si viene, debe existir y ser del mismo dueño.
    if (payload.topicId !== undefined && payload.topicId !== null) {
      const topic = await topicModel.findById(payload.topicId);
      if (!topic) throw AppError.notFound('No existe el tema indicado.');

      assertOwnership(req.user, topic.userId, 'tema');
      if (Number(topic.userId) !== Number(subject.userId)) {
        throw AppError.forbidden('El tema indicado no pertenece a la materia.');
      }
    }

    // El dueño del ejercicio es el dueño de la materia.
    const ownerId = subject.userId;

    const id = await exerciseModel.create(ownerId, payload);
    const exercise = await exerciseModel.findById(id);

    sendSuccess(res, { status: 201, message: 'Ejercicio creado correctamente.', data: { exercise } });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/exercises/:id */
export const updateExercise = async (req, res, next) => {
  try {
    const exercise = await exerciseModel.findById(req.params.id);
    if (!exercise) throw AppError.notFound('No existe el ejercicio solicitado.');

    assertOwnership(req.user, exercise.userId, 'ejercicio');

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await exerciseModel.update(req.params.id, req.body, ownerFilter);
    const updated = await exerciseModel.findById(req.params.id);

    sendSuccess(res, { message: 'Ejercicio actualizado correctamente.', data: { exercise: updated } });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/exercises/:id */
export const deleteExercise = async (req, res, next) => {
  try {
    const exercise = await exerciseModel.findById(req.params.id);
    if (!exercise) throw AppError.notFound('No existe el ejercicio solicitado.');

    assertOwnership(req.user, exercise.userId, 'ejercicio');

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await exerciseModel.remove(req.params.id, ownerFilter);

    sendSuccess(res, { message: 'Ejercicio eliminado correctamente.', data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

export default {
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
};
