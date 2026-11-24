/**
 * STUDIA - Controlador de materias (/api/subjects)
 * ------------------------------------------------------------------
 * REGLAS DE ACCESO
 *   - El ESTUDIANTE administra SUS materias: las consultas filtran por el
 *     user_id de la sesion y, antes de tocar una fila concreta, se comprueba
 *     la propiedad con assertOwnership.
 *   - El ADMINISTRADOR puede gestionar (soporte) las materias de cualquier
 *     estudiante indicando ?userUuid= o enviando userUuid en el cuerpo.
 *
 * El dueño NUNCA se toma del cuerpo de la peticion para un estudiante: siempre
 * procede de la sesion verificada.
 */

import * as subjectModel from '../models/subject.model.js';
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

/** GET /api/subjects */
export const listSubjects = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    // El estudiante solo ve las suyas; el admin filtra por userUuid o ve todas.
    let userId = req.user.id;
    if (req.user.role === 'admin') {
      userId = req.query.userUuid ? await resolveOwnerId(req, req.query.userUuid) : null;
    }

    const { rows, total } = await subjectModel.list({
      userId,
      status: req.query.status,
      search: req.query.search,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de materias.',
      data: {
        subjects: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/subjects/:id */
export const getSubject = async (req, res, next) => {
  try {
    const subject = await subjectModel.findById(req.params.id);
    if (!subject) throw AppError.notFound('No existe la materia solicitada.');

    assertOwnership(req.user, subject.userId, 'materia');

    // Se expone el uuid publico del dueño (nunca su id interno) para que el
    // panel de la materia pueda crear TAREAS correctamente asignadas cuando
    // quien opera es un administrador: el dueño de una tarea se toma del
    // cuerpo de la peticion (`userUuid`), no de la materia.
    const owner = await userModel.findById(subject.userId);

    sendSuccess(res, {
      message: 'Materia encontrada.',
      data: { subject: { ...subject, userUuid: owner?.uuid ?? null } },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/subjects */
export const createSubject = async (req, res, next) => {
  try {
    const { userUuid, ...payload } = req.body;
    const ownerId = await resolveOwnerId(req, userUuid);

    const id = await subjectModel.create(ownerId, payload);
    const subject = await subjectModel.findById(id);

    sendSuccess(res, { status: 201, message: 'Materia creada correctamente.', data: { subject } });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/subjects/:id */
export const updateSubject = async (req, res, next) => {
  try {
    const subject = await subjectModel.findById(req.params.id);
    if (!subject) throw AppError.notFound('No existe la materia solicitada.');

    assertOwnership(req.user, subject.userId, 'materia');

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await subjectModel.update(req.params.id, req.body, ownerFilter);
    const updated = await subjectModel.findById(req.params.id);

    sendSuccess(res, { message: 'Materia actualizada correctamente.', data: { subject: updated } });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/subjects/:id */
export const deleteSubject = async (req, res, next) => {
  try {
    const subject = await subjectModel.findById(req.params.id);
    if (!subject) throw AppError.notFound('No existe la materia solicitada.');

    assertOwnership(req.user, subject.userId, 'materia');

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await subjectModel.remove(req.params.id, ownerFilter);

    sendSuccess(res, { message: 'Materia eliminada correctamente.', data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/subjects/options - lista simple para selectores de formularios. */
export const listSubjectOptions = async (req, res, next) => {
  try {
    let userId = req.user.id;
    if (req.user.role === 'admin' && req.query.userUuid) {
      userId = await resolveOwnerId(req, req.query.userUuid);
    }

    const subjects = await subjectModel.listOptionsByUser(userId);
    sendSuccess(res, { message: 'Materias disponibles.', data: { subjects } });
  } catch (error) {
    next(error);
  }
};

export default {
  listSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  listSubjectOptions,
};
