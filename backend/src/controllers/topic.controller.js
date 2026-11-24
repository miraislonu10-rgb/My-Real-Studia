/**
 * STUDIA - Controlador de temas (/api/topics)
 * ------------------------------------------------------------------
 * REGLAS DE ACCESO
 *   - El ESTUDIANTE administra SUS temas: las consultas filtran por el
 *     user_id de la sesion y, antes de tocar una fila concreta, se comprueba
 *     la propiedad con assertOwnership.
 *   - El ADMINISTRADOR puede gestionar (soporte) los temas de cualquier
 *     estudiante indicando ?userUuid= o enviando userUuid en el cuerpo.
 *
 * Un tema pertenece SIEMPRE al dueño de su materia: el user_id se toma de la
 * materia (subject.userId) y nunca de un valor enviado en el cuerpo.
 */

import * as topicModel from '../models/topic.model.js';
import * as subjectModel from '../models/subject.model.js';
import * as userModel from '../models/user.model.js';
import { AppError } from '../utils/errors.js';
import { assertOwnership } from '../utils/ownership.js';
import { sendSuccess } from '../utils/respond.js';

/** Resuelve a que usuario pertenecera el recurso. */
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

/** GET /api/topics */
export const listTopics = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    // El estudiante solo ve los suyos; el admin filtra por userUuid o ve todos.
    let userId = req.user.id;
    if (req.user.role === 'admin') {
      userId = req.query.userUuid ? await resolveOwnerId(req, req.query.userUuid) : null;
    }

    const { rows, total } = await topicModel.list({
      userId,
      subjectId: req.query.subjectId,
      status: req.query.status,
      search: req.query.search,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de temas.',
      data: {
        topics: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/topics/:id */
export const getTopic = async (req, res, next) => {
  try {
    const topic = await topicModel.findById(req.params.id);
    if (!topic) throw AppError.notFound('No existe el tema solicitado.');

    assertOwnership(req.user, topic.userId, 'tema');

    sendSuccess(res, { message: 'Tema encontrado.', data: { topic } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/topics */
export const createTopic = async (req, res, next) => {
  try {
    const { userUuid, ...payload } = req.body;
    // Si se indica un usuario, exige rol de administrador y que exista.
    await resolveOwnerId(req, userUuid);

    // La materia debe existir y pertenecer al dueño objetivo.
    const subject = await subjectModel.findById(payload.subjectId);
    if (!subject) throw AppError.notFound('No existe la materia indicada.');

    assertOwnership(req.user, subject.userId, 'materia');

    // El tema pertenece SIEMPRE al dueño de la materia.
    const id = await topicModel.create(subject.userId, payload);
    const topic = await topicModel.findById(id);

    sendSuccess(res, { status: 201, message: 'Tema creado correctamente.', data: { topic } });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/topics/:id */
export const updateTopic = async (req, res, next) => {
  try {
    const topic = await topicModel.findById(req.params.id);
    if (!topic) throw AppError.notFound('No existe el tema solicitado.');

    assertOwnership(req.user, topic.userId, 'tema');

    // El cliente nunca puede cambiar el dueño directamente.
    const payload = { ...req.body };
    delete payload.userId;

    // Si se mueve a otra materia, comprobar que existe y es del mismo dueño.
    if (payload.subjectId !== undefined) {
      const subject = await subjectModel.findById(payload.subjectId);
      if (!subject) throw AppError.notFound('No existe la materia indicada.');

      assertOwnership(req.user, subject.userId, 'materia');

      // Se sincroniza el dueño con el de la nueva materia.
      payload.userId = subject.userId;
    }

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await topicModel.update(req.params.id, payload, ownerFilter);
    const updated = await topicModel.findById(req.params.id);

    sendSuccess(res, { message: 'Tema actualizado correctamente.', data: { topic: updated } });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/topics/:id */
export const deleteTopic = async (req, res, next) => {
  try {
    const topic = await topicModel.findById(req.params.id);
    if (!topic) throw AppError.notFound('No existe el tema solicitado.');

    assertOwnership(req.user, topic.userId, 'tema');

    const ownerFilter = req.user.role === 'admin' ? null : req.user.id;
    await topicModel.remove(req.params.id, ownerFilter);

    sendSuccess(res, { message: 'Tema eliminado correctamente.', data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

export default {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
};
